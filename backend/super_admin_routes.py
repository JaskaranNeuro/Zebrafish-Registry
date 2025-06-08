from flask import Blueprint, jsonify, request
from models_db import UserModel, FacilityModel, SubscriptionModel, SubscriptionTierModel  # Add SubscriptionTierModel here
from auth import super_admin_required
from config import db
from sqlalchemy import text
from datetime import datetime, timedelta, date

# Create a Blueprint
super_admin_bp = Blueprint('super_admin', __name__)

@super_admin_bp.route('/facilities', methods=['GET'])
@super_admin_required
def get_all_facilities():
    """Get all facilities with their subscription data"""
    try:
        facilities = FacilityModel.query.all()
        
        results = []
        for facility in facilities:
            subscription = SubscriptionModel.query.filter_by(facility_id=facility.id).first()
            admin_user = UserModel.query.filter_by(facility_id=facility.id, role='ADMIN').first()
            
            subscription_data = None
            if subscription:
                # Always use plan_name which is the standard field in SubscriptionModel
                subscription_data = {
                    "id": subscription.id,
                    "plan": subscription.plan_name,  # Use plan_name consistently
                    "status": "ACTIVE" if (subscription.is_active and 
                                          subscription.end_date > datetime.now()) 
                              else "INACTIVE",
                }
                
                # Add dates if they exist
                if hasattr(subscription, "start_date"):
                    subscription_data["start_date"] = subscription.start_date.strftime("%Y-%m-%d")
                
                if hasattr(subscription, "end_date"):
                    end_date = subscription.end_date
                    subscription_data["end_date"] = end_date.strftime("%Y-%m-%d")
                    
                    # Calculate days left correctly (inclusive of the end date)
                    today = datetime.now().date()
                    end_date_only = end_date.date() if isinstance(end_date, datetime) else end_date
                    
                    # Using (end_date - today) + 1 for inclusive calculation
                    delta = (end_date_only - today).days + 1
                    subscription_data["days_left"] = max(0, delta)
                
                # Add subscription tiers
                tiers = SubscriptionTierModel.query.filter_by(subscription_id=subscription.id).all()
                if tiers:
                    subscription_data["tiers"] = [{
                        "id": tier.id,
                        "plan_name": tier.plan_name,
                        "start_date": tier.start_date.strftime("%Y-%m-%d"),
                        "end_date": tier.end_date.strftime("%Y-%m-%d"),
                        "tier_order": tier.tier_order
                    } for tier in sorted(tiers, key=lambda t: t.tier_order)]
            
            facility_data = {
                "id": facility.id,
                "name": facility.name,
                "organization": getattr(facility, "organization_name", "Unknown Organization"),
                "admin": admin_user.username if admin_user else "No Admin",
                "subscription": subscription_data
            }
            results.append(facility_data)
            
        return jsonify(results), 200
    except Exception as e:
        print(f"Error getting facilities: {str(e)}")
        return jsonify({"message": f"Error: {str(e)}"}), 500

@super_admin_bp.route('/subscription/extend', methods=['POST'])
@super_admin_required
def extend_subscription():
    """Extend or create a subscription for a facility"""
    try:
        data = request.get_json()
        facility_id = data.get('facility_id')
        plan_type = data.get('plan_type', 'STANDARD')
        days = data.get('days', 365)
        
        if not facility_id:
            return jsonify({"message": "Facility ID is required"}), 400
            
        # Check if facility exists
        facility = FacilityModel.query.get(facility_id)
        if not facility:
            return jsonify({"message": f"Facility with ID {facility_id} not found"}), 404
            
        from subscription import get_plan_priority, ensure_timezone_aware, calculate_days_between
        
        # Get existing subscription or create new one
        subscription = SubscriptionModel.query.filter_by(facility_id=facility_id).first()
        
        if not subscription:
            # Create a new subscription
            subscription = SubscriptionModel(
                facility_id=facility_id,
                plan_name=plan_type,
                start_date=ensure_timezone_aware(datetime.utcnow()),
                end_date=ensure_timezone_aware(datetime.utcnow()) + timedelta(days=days),
                max_users=get_plan_limits(plan_type)["max_users"],
                max_racks=get_plan_limits(plan_type)["max_racks"],
                is_active=True,
                payment_id="super_admin_override"
            )
            db.session.add(subscription)
        else:
            # Ensure subscription dates are timezone-aware
            subscription.start_date = ensure_timezone_aware(subscription.start_date)
            subscription.end_date = ensure_timezone_aware(subscription.end_date)
            
            # Get priorities for current and new plan
            current_plan_priority = get_plan_priority(subscription.plan_name)
            new_plan_priority = get_plan_priority(plan_type)
            current_time = ensure_timezone_aware(datetime.utcnow())
            
            # Check if the subscription is active and not expired
            is_active_unexpired = subscription.is_active and ensure_timezone_aware(subscription.end_date) > current_time
            
            if is_active_unexpired:
                # Add existing tiers to our calculation
                all_tiers = []
                
                # Add current subscription as a tier
                if subscription.is_active:
                    all_tiers.append({
                        "plan_name": subscription.plan_name,
                        "days": calculate_days_between(current_time, subscription.end_date),
                        "priority": current_plan_priority,
                        "is_main": True
                    })
                
                # Add existing tiers
                existing_tiers = SubscriptionTierModel.query.filter_by(
                    subscription_id=subscription.id
                ).all()
                
                for tier in existing_tiers:
                    tier.start_date = ensure_timezone_aware(tier.start_date)
                    tier.end_date = ensure_timezone_aware(tier.end_date)
                    
                    if tier.end_date > current_time:
                        all_tiers.append({
                            "plan_name": tier.plan_name,
                            "days": calculate_days_between(tier.start_date, tier.end_date),
                            "priority": get_plan_priority(tier.plan_name),
                            "is_main": False
                        })
                
                # Add new tier
                all_tiers.append({
                    "plan_name": plan_type,
                    "days": days,
                    "priority": new_plan_priority,
                    "is_main": False
                })
                
                # Sort tiers by priority (highest first)
                all_tiers.sort(key=lambda x: x["priority"], reverse=True)
                
                # Clear existing tiers
                for tier in existing_tiers:
                    db.session.delete(tier)
                
                # Start from now
                current_date = current_time
                
                # Set highest priority plan as the main subscription
                highest_tier = all_tiers[0]
                subscription.plan_name = highest_tier["plan_name"]
                subscription.start_date = current_date
                subscription.end_date = current_date + timedelta(days=highest_tier["days"])
                subscription.max_users = get_plan_limits(highest_tier["plan_name"])["max_users"]
                subscription.max_racks = get_plan_limits(highest_tier["plan_name"])["max_racks"]
                subscription.is_active = True
                
                # Create remaining tiers in priority order
                current_date = subscription.end_date
                for i, tier_data in enumerate(all_tiers[1:], 1):
                    new_tier = SubscriptionTierModel(
                        subscription_id=subscription.id,
                        plan_name=tier_data["plan_name"],
                        start_date=current_date,
                        end_date=current_date + timedelta(days=tier_data["days"]),
                        tier_order=i
                    )
                    db.session.add(new_tier)
                    current_date = new_tier.end_date
            else:
                # If subscription is inactive or expired, start fresh
                subscription.plan_name = plan_type
                subscription.start_date = current_time
                subscription.end_date = current_time + timedelta(days=days)
                subscription.max_users = get_plan_limits(plan_type)["max_users"]
                subscription.max_racks = get_plan_limits(plan_type)["max_racks"]
                subscription.is_active = True
                
                # Clear any existing tiers
                existing_tiers = SubscriptionTierModel.query.filter_by(
                    subscription_id=subscription.id
                ).all()
                
                for tier in existing_tiers:
                    db.session.delete(tier)
        
        # Commit changes
        db.session.commit()
        
        # Consolidate tiers if the function exists
        try:
            from subscription import consolidate_subscription_tiers
            consolidate_subscription_tiers(subscription.id)
        except ImportError:
            print("Warning: consolidate_subscription_tiers function not available")
        
        # Create a response with the subscription details
        response_data = {
            "message": f"Subscription for {facility.name} extended successfully",
            "subscription": {
                "id": subscription.id,
                "plan": subscription.plan_name,
                "start_date": subscription.start_date.strftime("%Y-%m-%d"),
                "end_date": subscription.end_date.strftime("%Y-%m-%d"),
                "is_active": subscription.is_active,
                "max_users": subscription.max_users,
                "max_racks": subscription.max_racks
            }
        }
        
        # If there are tiers, include them in the response
        tiers = SubscriptionTierModel.query.filter_by(subscription_id=subscription.id).all()
        if tiers:
            response_data["subscription"]["tiers"] = [{
                "plan_name": tier.plan_name,
                "start_date": tier.start_date.strftime("%Y-%m-%d"),
                "end_date": tier.end_date.strftime("%Y-%m-%d")
            } for tier in sorted(tiers, key=lambda t: t.tier_order)]
        
        return jsonify(response_data), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error extending subscription: {str(e)}")
        return jsonify({"message": f"Error: {str(e)}"}), 500

@super_admin_bp.route('/subscription/end', methods=['POST'])
@super_admin_required
def end_subscription():
    """End a subscription immediately"""
    try:
        data = request.get_json()
        facility_id = data.get('facility_id')
        
        if not facility_id:
            return jsonify({"message": "Facility ID is required"}), 400
            
        subscription = SubscriptionModel.query.filter_by(facility_id=facility_id).first()
        
        if not subscription:
            return jsonify({"message": f"No subscription found for facility ID {facility_id}"}), 404
            
        if hasattr(subscription, 'is_active'):
            subscription.is_active = False
            
        if hasattr(subscription, 'end_date'):
            subscription.end_date = datetime.utcnow()
        
        db.session.commit()
        
        # Create response with fields that exist
        response_data = {
            "message": "Subscription ended successfully",
            "subscription": {
                "id": subscription.id
            }
        }
        
        if hasattr(subscription, 'plan_type'):
            response_data['subscription']['plan_type'] = subscription.plan_type
        elif hasattr(subscription, 'plan'):
            response_data['subscription']['plan'] = subscription.plan
        elif hasattr(subscription, 'tier'):
            response_data['subscription']['tier'] = subscription.tier
            
        if hasattr(subscription, 'is_active'):
            response_data['subscription']['is_active'] = subscription.is_active
            
        if hasattr(subscription, 'end_date'):
            response_data['subscription']['end_date'] = subscription.end_date.strftime("%Y-%m-%d")
        
        return jsonify(response_data), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error ending subscription: {str(e)}")
        return jsonify({"message": f"Error: {str(e)}"}), 500

# Helper function for max users per plan
def get_max_users(plan_type):
    """Return user limits based on subscription plan"""
    if plan_type == "BASIC":
        return 5  # Updated to match subscription.py
    elif plan_type == "STANDARD":
        return 10  # Updated to match subscription.py
    elif plan_type == "PREMIUM":
        return 15  # Updated to match subscription.py
    elif plan_type == "UNLIMITED":
        return 999  # Updated to match subscription.py
    else:
        return 2  # Default for trial or unknown plans

# Helper function for max racks per plan
def get_max_racks(plan_type):
    """Return rack limits based on subscription plan"""
    if plan_type == "BASIC":
        return 4  # Updated to match subscription.py
    elif plan_type == "STANDARD":
        return 10  # Updated to match subscription.py
    elif plan_type == "PREMIUM":
        return 20  # Updated to match subscription.py
    elif plan_type == "UNLIMITED":
        return 999  # Updated to match subscription.py
    else:
        return 3  # Default for trial or unknown plans

def get_plan_limits(plan_name):
    """Return resource limits based on plan name"""
    plans = {
        "TRIAL": {"max_users": 2, "max_racks": 3},
        "BASIC": {"max_users": 5, "max_racks": 4},      # Updated: 5 users, 4 racks
        "STANDARD": {"max_users": 10, "max_racks": 10}, # Updated: 10 users, 10 racks
        "PREMIUM": {"max_users": 15, "max_racks": 20},  # Updated: 15 users, 20 racks
        "UNLIMITED": {"max_users": 999, "max_racks": 999}  # Represents unlimited
    }
    return plans.get(plan_name.upper(), plans["BASIC"])