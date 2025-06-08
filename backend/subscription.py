# Create new file: backend/subscription.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from datetime import datetime, timedelta, timezone  # Added timezone here
from config import db
from models_db import SubscriptionModel, FacilityModel, UserModel, SubscriptionTierModel
from auth import admin_required, get_current_user_id
import stripe
from email_service import send_payment_confirmation_email

# Fix the ensure_timezone_aware function to handle None values:
def ensure_timezone_aware(dt):
    """Make sure a datetime object is timezone-aware, converting if needed"""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt

# In both files, replace lines containing Stripe API keys with:
import os
stripe.api_key = os.environ.get('STRIPE_API_KEY', '')

subscription_bp = Blueprint('subscription', __name__)

@subscription_bp.route('/status', methods=['GET'])
@jwt_required()
def get_subscription_status():
    """Get subscription status for current user's facility"""
    current_user_id = get_current_user_id()
    user = UserModel.query.get(current_user_id)
    
    if not user or not user.facility_id:
        return jsonify({"message": "No facility associated with user"}), 404
        
    subscription = SubscriptionModel.query.filter_by(facility_id=user.facility_id).first()
    
    if not subscription:
        return jsonify({"message": "No subscription found"}), 404
    
    # Ensure datetime objects are timezone-aware
    subscription.start_date = ensure_timezone_aware(subscription.start_date)
    subscription.end_date = ensure_timezone_aware(subscription.end_date)
    if subscription.original_plan_end_date:
        subscription.original_plan_end_date = ensure_timezone_aware(subscription.original_plan_end_date)
    
    # Calculate days remaining
    days_remaining = 0
    if subscription.is_active and ensure_timezone_aware(subscription.end_date) > ensure_timezone_aware(datetime.now()):
        # Use our helper function for consistent day calculation
        days_remaining = calculate_days_between(ensure_timezone_aware(datetime.now()), subscription.end_date) 
    
    response = {
        "facility_id": user.facility_id,
        "facility_name": user.facility.name if user.facility else "Unknown",
        "plan_name": subscription.plan_name,
        "start_date": subscription.start_date.isoformat() if subscription.start_date else None,
        "end_date": subscription.end_date.isoformat() if subscription.end_date else None,
        "is_active": subscription.is_active,
        "is_valid": subscription.is_active and subscription.end_date > ensure_timezone_aware(datetime.now()),
        "days_remaining": days_remaining,
        "max_users": subscription.max_users,
        "max_racks": subscription.max_racks,
        "auto_renew": subscription.auto_renew,  # Add auto-renewal status
        "renewal_period": subscription.renewal_period  # Add renewal period
    }
    
    # Collect active tiers (main subscription and additional tiers)
    subscription_tiers = []
    
    # Add current subscription if active and in future
    current_time = ensure_timezone_aware(datetime.now())
    if subscription.is_active and subscription.end_date > current_time:
        subscription_tiers.append({
            "plan_name": subscription.plan_name,
            "start_date": subscription.start_date,
            "end_date": subscription.end_date,
            "days": calculate_days_between(subscription.start_date, subscription.end_date)
        })
    
    # Add future tiers from SubscriptionTierModel
    tiers = subscription.subscription_tiers
    for tier in tiers:
        tier.start_date = ensure_timezone_aware(tier.start_date)
        tier.end_date = ensure_timezone_aware(tier.end_date)
        if tier.end_date > current_time:
            subscription_tiers.append({
                "plan_name": tier.plan_name,
                "start_date": tier.start_date,
                "end_date": tier.end_date,
                "days": calculate_days_between(tier.start_date, tier.end_date)
            })
    
    # Sort tiers by start date
    subscription_tiers.sort(key=lambda x: x['start_date'])
    
    response.update({
        "subscription_tiers": [{
            "plan_name": tier["plan_name"],
            "start_date": tier["start_date"].isoformat(),
            "end_date": tier["end_date"].isoformat(),
            "days": tier["days"]
        } for tier in subscription_tiers],
        "has_multiple_tiers": len(subscription_tiers) > 1
    })
    
    return jsonify(response), 200

@subscription_bp.route('/extend', methods=['POST'])
@admin_required
def extend_subscription():
    data = request.json
    period = data.get('period', '1_month')
    days = get_period_days(period)
    plan = data.get('plan', 'BASIC')
    
    current_user_id = get_current_user_id()
    admin = UserModel.query.get(current_user_id)
    
    if not admin or not admin.facility_id:
        return jsonify({"message": "No facility associated with admin account"}), 400
    
    facility_id = admin.facility_id
    subscription = SubscriptionModel.query.filter_by(facility_id=facility_id).first()
    
    if not subscription:
        # First subscription - simply create with proper dates
        subscription = SubscriptionModel(
            facility_id=facility_id,
            plan_name=plan,
            start_date=ensure_timezone_aware(datetime.now()),
            end_date=ensure_timezone_aware(datetime.now()) + timedelta(days=days),  # Remove -1 to avoid day discrepancy
            max_users=get_plan_limits(plan)["max_users"],
            max_racks=get_plan_limits(plan)["max_racks"],
            is_active=True
        )
        db.session.add(subscription)
    else:
        # Ensure subscription dates are timezone-aware
        subscription.start_date = ensure_timezone_aware(subscription.start_date)
        subscription.end_date = ensure_timezone_aware(subscription.end_date)
        current_date = ensure_timezone_aware(datetime.now())

        # Check if we're extending with the same plan type
        if plan == subscription.plan_name:
            # Check how long user has used this plan
            usage_interval = ensure_timezone_aware(datetime.now()) - ensure_timezone_aware(subscription.start_date)
            hours_used = usage_interval.total_seconds() / 3600.0

            # If more than 12 hours were used, reduce leftover days by 1
            if hours_used > 12:
                # Only subtract one day if we have at least one day left
                leftover_days = (subscription.end_date.date() - ensure_timezone_aware(datetime.now()).date()).days
                if leftover_days > 0:
                    subscription.end_date = subscription.end_date - timedelta(days=1)

            # Now extend the subscription by the new days
            subscription.end_date = subscription.end_date + timedelta(days=days)
        else:
            # Check for existing tiers of the same plan type
            existing_tier = None
            for tier in subscription.subscription_tiers:
                if tier.plan_name == plan:
                    existing_tier = tier
                    break
            
            if existing_tier:
                # Add days to existing tier of the same plan
                print(f"Adding {days} days to existing tier of {plan} plan")
                existing_tier.end_date = existing_tier.end_date + timedelta(days=days)
            else:
                # Create new tier since plan types are different
                start_date = subscription.end_date
                
                # Create new tier
                new_tier = SubscriptionTierModel(
                    subscription_id=subscription.id,
                    plan_name=plan,
                    start_date=start_date,
                    end_date=start_date + timedelta(days=days),  # Remove -1 to be consistent
                    tier_order=1
                )
                db.session.add(new_tier)
    
    db.session.commit()
    consolidate_subscription_tiers(subscription.id)  # This consolidates tiers of same plan

    return jsonify({
        "message": "Subscription extended successfully",
        "subscription": {
            "facility_id": subscription.facility_id,
            "plan_name": subscription.plan_name,
            "end_date": subscription.end_date.isoformat(),
            "max_users": subscription.max_users,
            "max_racks": subscription.max_racks
        }
    })

# Update the get_period_days function

def get_period_days(period):
    """Convert period string to number of days"""
    period_map = {
        "1_month": 30,      # Set to exactly 30 days
        "3_months": 90,     # Set to exactly 90 days
        "6_months": 180,    # Set to exactly 180 days
        "1_year": 365       # Set to exactly 365 days
    }
    return period_map.get(period, 30)  # Default to 30 days (1 month)

# Update get_available_plans to include periods
@subscription_bp.route('/plans', methods=['GET'])
def get_available_plans():
    """Get available subscription plans and periods"""
    plans = [
        {
            "id": "TRIAL",
            "name": "Trial Plan",
            "description": "Free 30-day trial",
            "max_users": 2,
            "max_racks": 3,
            "is_trial": True,
            "price_per_day": 0
        },
        {
            "id": "BASIC",
            "name": "Basic Plan",
            "description": "For small facilities",
            "max_users": 5,
            "max_racks": 4,  # Updated
            "is_trial": False,
            "price_per_day": 1.00
        },
        {
            "id": "STANDARD",
            "name": "Standard Plan",
            "description": "For medium facilities",
            "max_users": 10,  # Updated
            "max_racks": 10,  # Updated
            "is_trial": False,
            "price_per_day": 2.50
        },
        {
            "id": "PREMIUM",
            "name": "Premium Plan",
            "description": "For large facilities",
            "max_users": 15,  # Updated
            "max_racks": 20,  # Updated
            "is_trial": False,
            "price_per_day": 5.00
        },
        {
            "id": "UNLIMITED",
            "name": "Unlimited Plan",
            "description": "No limits on users or racks",
            "max_users": 999,
            "max_racks": 999,
            "is_trial": False,
            "price_per_day": 10.00  # Higher price for unlimited
        }
    ]
    
    periods = [
        {
            "id": "1_month",
            "name": "1 Month",
            "days": 30,
            "discount": 0
        },
        {
            "id": "3_months",
            "name": "3 Months",
            "days": 90,
            "discount": 0.05
        },
        {
            "id": "6_months",
            "name": "6 Months",
            "days": 180,
            "discount": 0.10
        },
        {
            "id": "1_year",
            "name": "1 Year",
            "days": 365,
            "discount": 0.15
        }
    ]
    
    return jsonify({"plans": plans, "periods": periods})

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

# Add a new helper function to determine plan priority
def get_plan_priority(plan_name):
    """Return the priority of a plan (higher number means higher priority)"""
    if not plan_name:
        return 0
    
    plan_priorities = {
        "TRIAL": 0,
        "BASIC": 1,
        "STANDARD": 2, 
        "PREMIUM": 3,
        "UNLIMITED": 4  # Add with highest priority
    }
    
    return plan_priorities.get(plan_name.upper(), 0)

@subscription_bp.route('/test', methods=['GET'])
def test_endpoint():
    return jsonify({"message": "Subscription API is working!"}), 200

# Update process_payment function
@subscription_bp.route('/payment', methods=['POST'])
@jwt_required()
def process_payment():
    try:
        data = request.json
        payment_method_id = data.get('paymentMethodId')
        plan = data.get('plan', 'BASIC')
        period = data.get('period', '1_month')
        auto_renew = data.get('autoRenew', True)  # Get auto-renewal preference
        days = get_period_days(period)
        
        # Get discount for this period
        discount = 0
        if period == '3_months':
            discount = 0.05
        elif period == '6_months':
            discount = 0.1
        elif period == '1_year':
            discount = 0.15
        
        # Calculate price based on plan and days with discount
        price_per_day = {
            "TRIAL": 0,
            "BASIC": 1.00,  # $1 per day
            "STANDARD": 2.50,  # $2.50 per day
            "PREMIUM": 5.00    # $5 per day
        }
        
        base_amount = price_per_day.get(plan, 1.00) * days
        discounted_amount = base_amount * (1 - discount)
        amount = int(discounted_amount * 100)  # Amount in cents
        
        # Get current user and facility
        current_user_id = get_current_user_id()
        user = UserModel.query.get(current_user_id)
        facility = FacilityModel.query.get(user.facility_id)
        
        if not facility:
            return jsonify({"message": "No facility found"}), 404
        
        try:
            # Create payment intent with configuration to allow redirects
            payment_intent = stripe.PaymentIntent.create(
                amount=amount,
                currency='usd',
                payment_method=payment_method_id,
                confirm=True,
                automatic_payment_methods={
                    "enabled": True,
                    "allow_redirects": "always"
                },
                return_url=data.get('return_url', f"http://localhost:3000/#/payment-return"),
                metadata={
                    "user_id": user.id,
                    "facility_id": facility.id,
                    "plan": plan,
                    "days": days
                }
            )
            
            # Check if additional action is needed (like 3D Secure)
            if payment_intent.status == 'requires_action':
                # Return details the client needs to handle the additional action
                return jsonify({
                    "requires_action": True,
                    "payment_intent_client_secret": payment_intent.client_secret,
                    "payment_intent_id": payment_intent.id,
                    "plan": plan,
                    "days": days
                })
            
            # If payment is successful, extend the subscription
            if payment_intent.status == 'succeeded':
                subscription = SubscriptionModel.query.filter_by(facility_id=user.facility_id).first()
                
                if not subscription:
                    # Create new subscription
                    subscription = SubscriptionModel(
                        facility_id=user.facility_id,
                        user_id=user.id,
                        plan_name=plan,
                        start_date=ensure_timezone_aware(datetime.now()),
                        end_date=ensure_timezone_aware(datetime.now()) + timedelta(days=days-1),  # -1 for inclusive counting
                        max_users=get_plan_limits(plan)["max_users"],
                        max_racks=get_plan_limits(plan)["max_racks"],
                        is_active=True,
                        payment_id=payment_intent.id,
                        auto_renew=auto_renew,  # Set auto-renewal preference
                        renewal_period=period,  # Store the period for renewal
                        payment_method_id=payment_method_id  # Store payment method
                    )
                    db.session.add(subscription)
                else:
                    # Ensure subscription datetime fields are timezone-aware
                    subscription.start_date = ensure_timezone_aware(subscription.start_date)
                    subscription.end_date = ensure_timezone_aware(subscription.end_date)
                    if hasattr(subscription, 'original_plan_end_date') and subscription.original_plan_end_date:
                        subscription.original_plan_end_date = ensure_timezone_aware(subscription.original_plan_end_date)

                    # Add timezone awareness check for existing tiers
                    existing_tiers = SubscriptionTierModel.query.filter_by(
                        subscription_id=subscription.id
                    ).all()
                    
                    for tier in existing_tiers:
                        tier.start_date = ensure_timezone_aware(tier.start_date)
                        tier.end_date = ensure_timezone_aware(tier.end_date)
                    
                    new_plan_priority = get_plan_priority(plan)
                    
                    # Get all existing tiers including current subscription
                    all_tiers = []
                    
                    # Add current subscription as a tier if active
                    current_time = ensure_timezone_aware(datetime.now())
                    # IMPORTANT FIX: Ensure subscription.end_date is timezone-aware before comparing
                    if subscription.is_active and ensure_timezone_aware(subscription.end_date) > current_time:
                        all_tiers.append({
                            "plan_name": subscription.plan_name,
                            "days": calculate_days_between(current_time, ensure_timezone_aware(subscription.end_date)),
                            "priority": get_plan_priority(subscription.plan_name)
                        })
                    
                    # Add existing tiers
                    existing_tiers = SubscriptionTierModel.query.filter_by(
                        subscription_id=subscription.id
                    ).all()
                    
                    for tier in existing_tiers:
                        # Ensure tier dates are timezone-aware
                        tier.start_date = ensure_timezone_aware(tier.start_date)
                        tier.end_date = ensure_timezone_aware(tier.end_date)
                        
                        if ensure_timezone_aware(tier.end_date) > current_time:
                            all_tiers.append({
                                "plan_name": tier.plan_name,
                                "days": calculate_days_between(tier.start_date, tier.end_date),
                                "priority": get_plan_priority(tier.plan_name)
                            })
                    
                    # Add new plan
                    all_tiers.append({
                        "plan_name": plan,
                        "days": days,
                        "priority": new_plan_priority
                    })
                    
                    # Sort tiers by priority (highest first)
                    all_tiers.sort(key=lambda x: x["priority"], reverse=True)
                    
                    # Clear existing tiers
                    for tier in existing_tiers:
                        db.session.delete(tier)
                    
                    # Start from now
                    current_date = ensure_timezone_aware(datetime.now())
                    
                    # Set highest priority plan as the main subscription
                    highest_tier = all_tiers[0]
                    subscription.plan_name = highest_tier["plan_name"]
                    subscription.start_date = current_date
                    subscription.end_date = current_date + timedelta(days=highest_tier["days"]-1)  # -1 for inclusive counting
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
                            end_date=current_date + timedelta(days=tier_data["days"]-1),  # -1 for inclusive counting
                            tier_order=i
                        )
                        db.session.add(new_tier)
                        current_date = new_tier.end_date
                    
                    # Update existing subscription
                    subscription.auto_renew = auto_renew
                    subscription.renewal_period = period
                    subscription.payment_method_id = payment_method_id
                
                db.session.commit()
                consolidate_subscription_tiers(subscription.id)  # This consolidates tiers of same plan
                
                # Send confirmation email after successful payment
                try:
                    send_payment_confirmation_email(
                        user_email=user.email,
                        plan_name=plan,
                        days=days,
                        amount=amount / 100.0,  # Convert cents back to dollars
                        end_date=subscription.end_date
                    )
                    print(f"Payment receipt email sent to {user.email}")
                except Exception as email_err:
                    # Log email error but don't fail the payment process
                    print(f"Email sending failed: {str(email_err)}")
                
                return jsonify({
                    "message": "Payment successful and subscription extended",
                    "subscription": {
                        "facility_id": subscription.facility_id,
                        "plan_name": subscription.plan_name,
                        "end_date": subscription.end_date.isoformat(),
                        "max_users": subscription.max_users,
                        "max_racks": subscription.max_racks
                    }
                })
            else:
                return jsonify({
                    "message": "Payment processing incomplete", 
                    "status": payment_intent.status
                }), 400
                
        except stripe.error.CardError as e:
            # Since it's a decline, stripe.error.CardError will be caught
            error_message = e.error.message
            return jsonify({"message": f"Card declined: {error_message}"}), 400
            
        except stripe.error.RateLimitError as e:
            # Too many requests made to the API too quickly
            return jsonify({"message": "Rate limit exceeded, please try again later"}), 429
            
        except stripe.error.InvalidRequestError as e:
            # Invalid parameters were supplied to Stripe's API
            return jsonify({"message": f"Invalid request: {str(e)}"}), 400
            
        except stripe.error.AuthenticationError as e:
            # Authentication with Stripe's API failed
            # (maybe you changed API keys recently)
            print("Stripe authentication error:", str(e))
            return jsonify({"message": "Authentication with payment provider failed"}), 500
            
        except stripe.error.APIConnectionError as e:
            # Network communication with Stripe failed
            return jsonify({"message": "Network error, please try again"}), 503
            
        except stripe.error.StripeError as e:
            # Display a very generic error to the user, and maybe send
            # yourself an email
            print("Stripe error:", str(e))
            return jsonify({"message": "Payment processing error"}), 500
            
        except Exception as e:
            # Something else happened, completely unrelated to Stripe
            print("Unexpected error:", str(e))
            return jsonify({"message": "An unexpected error occurred"}), 500
            
    except Exception as e:
        print("Error in process_payment view:", str(e))
        return jsonify({"message": f"Server error: {str(e)}"}), 500

# Add a new function to handle successful payment        
def handle_successful_payment(payment_id, facility_id, user_id, plan, days):
    subscription = SubscriptionModel.query.filter_by(facility_id=facility_id).first()
    
    if not subscription:
        subscription = SubscriptionModel(
            facility_id=facility_id,
            user_id=user_id,
            plan_name=plan,
            start_date=ensure_timezone_aware(datetime.now()),
            end_date=ensure_timezone_aware(datetime.now()) + timedelta(days=days),  # removed -1 for clarity
            max_users=get_plan_limits(plan)["max_users"],
            max_racks=get_plan_limits(plan)["max_racks"],
            is_active=True,
            payment_id=payment_id
        )
        db.session.add(subscription)
    else:
        if subscription.is_active and ensure_timezone_aware(subscription.end_date) > ensure_timezone_aware(datetime.now()):
            last_end_date = subscription.end_date
            existing_tiers = db.session.query(SubscriptionTierModel).filter_by(
                subscription_id=subscription.id
            ).order_by(SubscriptionTierModel.tier_order.desc()).all()
            
            if existing_tiers:
                last_tier_end_date = existing_tiers[0].end_date
                last_end_date = max(last_end_date, last_tier_end_date)
            
            # If the new plan is the same as the subscription plan, just extend
            if plan == subscription.plan_name:
                subscription.end_date = subscription.end_date + timedelta(days=days)
            else:
                # Otherwise, create a new tier
                new_tier = SubscriptionTierModel(
                    subscription_id=subscription.id,
                    plan_name=plan,
                    start_date=last_end_date,
                    end_date=last_end_date + timedelta(days=days),
                    tier_order=len(existing_tiers) + 1
                )
                db.session.add(new_tier)
                
                if not subscription.original_plan_name:
                    subscription.original_plan_name = subscription.plan_name
                    subscription.original_plan_end_date = subscription.end_date
        else:
            # If subscription is expired or inactive, reset it
            subscription.start_date = ensure_timezone_aware(datetime.now())
            subscription.end_date = ensure_timezone_aware(datetime.now()) + timedelta(days=days)
        
        # Update the subscription if plan changed
        if plan != subscription.plan_name:
            subscription.plan_name = plan
            subscription.max_users = get_plan_limits(plan)["max_users"]
            subscription.max_racks = get_plan_limits(plan)["max_racks"]
        
        subscription.is_active = True
        subscription.payment_id = payment_id
    
    db.session.commit()

# New endpoint to verify 3D Secure payment after return
@subscription_bp.route('/payment/verify', methods=['POST'])
@jwt_required()
def verify_payment():
    data = request.json
    payment_intent_id = data.get('payment_intent_id')
    plan = data.get('plan', 'BASIC')
    days = data.get('days', 30)
    
    if not payment_intent_id:
        return jsonify({"message": "Missing payment intent ID"}), 400
    
    try:
        # Get current user and facility
        current_user_id = get_current_user_id()
        user = UserModel.query.get(current_user_id)
        facility = FacilityModel.query.get(user.facility_id)
        
        # Retrieve the payment intent from Stripe
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        # Check if the payment was successful
        if payment_intent.status == 'succeeded':
            # Update or create subscription
            subscription = SubscriptionModel.query.filter_by(facility_id=user.facility_id).first()
            
            if subscription:
                # Ensure subscription dates are timezone-aware
                subscription.start_date = ensure_timezone_aware(subscription.start_date)
                subscription.end_date = ensure_timezone_aware(subscription.end_date)
                if subscription.original_plan_end_date:
                    subscription.original_plan_end_date = ensure_timezone_aware(subscription.original_plan_end_date)
            
            end_date = None
            if not subscription:
                # Create new subscription
                end_date = ensure_timezone_aware(datetime.now()) + timedelta(days=int(days)-1)  # -1 for inclusive counting
                subscription = SubscriptionModel(
                    facility_id=user.facility_id,
                    user_id=user.id,
                    plan_name=plan,
                    start_date=ensure_timezone_aware(datetime.now()),
                    end_date=end_date,
                    max_users=get_plan_limits(plan)["max_users"],
                    max_racks=get_plan_limits(plan)["max_racks"],
                    is_active=True,
                    payment_id=payment_intent.id
                )
                db.session.add(subscription)
            else:
                # Extend existing subscription
                if subscription.is_active and ensure_timezone_aware(subscription.end_date) > ensure_timezone_aware(datetime.now()):
                    # Compare plan priorities to decide which plan should be used first
                    current_plan_priority = get_plan_priority(subscription.plan_name)
                    new_plan_priority = get_plan_priority(plan)
                    
                    if new_plan_priority > current_plan_priority:
                        # If new plan is higher tier, use it first and make the current plan the original
                        subscription.original_plan_name = subscription.plan_name
                        subscription.original_plan_end_date = subscription.end_date
                        
                        # Set the new higher tier plan as the main plan
                        subscription.plan_name = plan
                        subscription.end_date = ensure_timezone_aware(datetime.now()) + timedelta(days=int(days)-1)  # -1 for inclusive counting
                        subscription.max_users = get_plan_limits(plan)["max_users"]
                        subscription.max_racks = get_plan_limits(plan)["max_racks"]
                    else:
                        # If new plan is same or lower tier, keep current as main and extend the end date
                        end_date = subscription.end_date + timedelta(days=int(days)-1)  # -1 for inclusive counting
                        subscription.end_date = end_date
                        
                        # If the plans are different, store the new plan as original
                        if plan != subscription.plan_name:
                            subscription.original_plan_name = plan
                            subscription.original_plan_end_date = end_date
                            
                            # Check if we need to create a new tier
                            if subscription.is_active and ensure_timezone_aware(subscription.end_date) > ensure_timezone_aware(datetime.now()):
                                # Instead of just updating original_plan_name and original_plan_end_date,
                                # create a new tier entry
                                
                                # First, count existing tiers to determine order
                                existing_tiers_count = db.session.query(SubscriptionTierModel).filter_by(
                                    subscription_id=subscription.id
                                ).count()
                                
                                # Create the new tier
                                new_tier = SubscriptionTierModel(
                                    subscription_id=subscription.id,
                                    plan_name=plan,
                                    start_date=subscription.end_date,  # Start after current plan ends
                                    end_date=subscription.end_date + timedelta(days=int(days)-1),  # -1 for inclusive counting
                                    tier_order=existing_tiers_count + 1  # Order is 1-based
                                )
                                db.session.add(new_tier)
                                
                                # Update current subscription end date
                                subscription.end_date = subscription.end_date + timedelta(days=int(days)-1)  # -1 for inclusive counting
                else:
                    end_date = ensure_timezone_aware(datetime.now()) + timedelta(days=int(days)-1)  # -1 for inclusive counting
                    subscription.start_date = ensure_timezone_aware(datetime.now())
                    subscription.end_date = end_date
                    
                # Update plan if changed
                if plan != subscription.plan_name:
                    subscription.plan_name = plan
                    subscription.max_users = get_plan_limits(plan)["max_users"]
                    subscription.max_racks = get_plan_limits(plan)["max_racks"]
                    
                subscription.is_active = True
                subscription.payment_id = payment_intent.id
            
            db.session.commit()
            consolidate_subscription_tiers(subscription.id)  # This consolidates tiers of same plan
            
            # Send confirmation email after successful payment
            try:
                from email_service import send_payment_confirmation_email
                send_payment_confirmation_email(
                    user_email=user.email,
                    plan_name=plan,
                    days=days,
                    amount=payment_intent.amount / 100.0,
                    end_date=end_date
                )
                print(f"Payment receipt email sent to {user.email}")
            except Exception as email_err:
                # Log email error but don't fail the process
                print(f"Email sending failed: {str(email_err)}")
            
            return jsonify({
                "message": "Payment successful and subscription extended",
                "subscription": {
                    "facility_id": subscription.facility_id,
                    "plan_name": subscription.plan_name,
                    "end_date": subscription.end_date.isoformat(),
                    "max_users": subscription.max_users,
                    "max_racks": subscription.max_racks
                }
            })
        else:
            return jsonify({
                "message": f"Payment verification failed. Status: {payment_intent.status}",
                "payment_status": payment_intent.status
            }), 400
            
    except stripe.error.StripeError as e:
        return jsonify({"message": f"Stripe error: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"message": f"Error verifying payment: {str(e)}"}), 500

@subscription_bp.route('/admin-extend', methods=['POST'])
@jwt_required()
def admin_extend_subscription():
    """Special endpoint for super admins to extend subscriptions without payment"""
    current_user_id = get_current_user_id()
    admin = UserModel.query.get(current_user_id)
    
    # Check if the user is a super admin
    if not admin or not admin.is_super_admin:
        return jsonify({"message": "Unauthorized"}), 403
    
    data = request.json
    facility_id = data.get('facility_id')
    days = data.get('days', 30)
    plan = data.get('plan', 'PREMIUM')
    
    # Get the facility
    facility = FacilityModel.query.get(facility_id)
    if not facility:
        return jsonify({"message": "Facility not found"}), 404
    
    # Get or create subscription
    subscription = SubscriptionModel.query.filter_by(facility_id=facility_id).first()
    
    if not subscription:
        subscription = SubscriptionModel(
            facility_id=facility_id,
            plan_name=plan,
            start_date=ensure_timezone_aware(datetime.now()),
            end_date=ensure_timezone_aware(datetime.now()) + timedelta(days=days-1),  # -1 for inclusive counting
            max_users=get_plan_limits(plan)["max_users"],
            max_racks=get_plan_limits(plan)["max_racks"],
            is_active=True,
            payment_id="admin_override"
        )
        db.session.add(subscription)
    else:
        # Extend existing subscription
        if subscription.is_active and ensure_timezone_aware(subscription.end_date) > ensure_timezone_aware(datetime.now()):
            subscription.end_date = subscription.end_date + timedelta(days=days-1)  # -1 for inclusive counting
        else:
            subscription.start_date = ensure_timezone_aware(datetime.now())
            subscription.end_date = ensure_timezone_aware(datetime.now()) + timedelta(days=days - 1)  # -1 for inclusive counting
            
        # Update plan if specified
        if plan and plan != subscription.plan_name:
            subscription.plan_name = plan
            subscription.max_users = get_plan_limits(plan)["max_users"]
            subscription.max_racks = get_plan_limits(plan)["max_racks"]
            
        subscription.is_active = True
    
    db.session.commit()
    
    # Send notification email about admin extension
    try:
        # Get admin email for the facility
        facility_admin = UserModel.query.filter_by(
            facility_id=facility_id, 
            role='ADMIN'
        ).first()
        
        if facility_admin and facility_admin.email:
            send_payment_confirmation_email(
                user_email=facility_admin.email,
                plan_name=plan,
                days=days,
                amount=0.00,  # $0 since it's an admin override
                end_date=subscription.end_date
            )
            print(f"Admin extension notification sent to {facility_admin.email}")
    except Exception as email_err:
        # Log email error but don't fail the process
        print(f"Admin notification email failed: {str(email_err)}")
    
    return jsonify({
        "message": "Subscription extended via admin override",
        "subscription": {
            "facility_id": subscription.facility_id,
            "facility_name": facility.name,
            "plan_name": subscription.plan_name,
            "end_date": subscription.end_date.isoformat(),
            "max_users": subscription.max_users,
            "max_racks": subscription.max_racks
        }
    })

@subscription_bp.route('/end', methods=['POST'])
@jwt_required()  # Add JWT requirement for security
def end_subscription():
    try:
        # Get current user and their facility
        current_user_id = get_current_user_id()
        user = UserModel.query.get(current_user_id)
        
        if not user or not user.facility_id:
            return jsonify({"message": "No facility associated with user"}), 404
            
        # Get subscription for this user's facility
        subscription = SubscriptionModel.query.filter_by(facility_id=user.facility_id).first()
        
        if not subscription:
            return jsonify({"message": "Subscription not found"}), 404
        
        # End the subscription
        subscription.is_active = False
        subscription.end_date = ensure_timezone_aware(datetime.now())
        
        # Also delete/clear all subscription tiers
        tiers = SubscriptionTierModel.query.filter_by(subscription_id=subscription.id).all()
        for tier in tiers:
            db.session.delete(tier)
        
        # Clear original plan data
        subscription.original_plan_name = None
        subscription.original_plan_end_date = None
        
        db.session.commit()
        
        return jsonify({
            "message": "Subscription ended successfully",
            "subscription": {
                "facility_id": user.facility_id,
                "plan_name": subscription.plan_name,
                "end_date": subscription.end_date.isoformat(),
                "is_active": subscription.is_active
            }
        }), 200
    
    except Exception as e:
        db.session.rollback()
        print("Error in end_subscription view:", str(e))
        return jsonify({"message": f"Server error: {str(e)}"}), 500

@subscription_bp.route('/admin/end', methods=['POST'])
@jwt_required()
def admin_end_subscription():
    """Special endpoint for super admins to end subscriptions"""
    try:
        # Check if user is super admin
        current_user_id = get_current_user_id()
        admin = UserModel.query.get(current_user_id)
        
        if not admin or not admin.is_super_admin:
            return jsonify({"message": "Unauthorized"}), 403
        
        data = request.json
        facility_id = data.get('facility_id')
        
        if not facility_id:
            return jsonify({"message": "Facility ID is required"}), 400
        
        # Get the facility
        facility = FacilityModel.query.get(facility_id)
        if not facility:
            return jsonify({"message": "Facility not found"}), 404
        
        # Check if subscription exists
        subscription = SubscriptionModel.query.filter_by(facility_id=facility_id).first()
        
        if not subscription:
            return jsonify({"message": "No active subscription found"}), 404
        
        # End the subscription now
        subscription.end_date = ensure_timezone_aware(datetime.now())
        subscription.is_active = False
        
        # If there's a tiered subscription, clear it
        if subscription.original_plan_name and subscription.original_plan_end_date:
            subscription.original_plan_name = None
            subscription.original_plan_end_date = None
        
        db.session.commit()
        
        return jsonify({
            "message": "Subscription ended successfully",
            "subscription": {
                "facility_id": subscription.facility_id,
                "facility_name": facility.name,
                "plan_name": subscription.plan_name,
                "end_date": subscription.end_date.isoformat(),
                "is_active": subscription.is_active
            }
        })
    
    except Exception as e:
        db.session.rollback()
        print(f"Error in admin_end_subscription: {str(e)}")
        return jsonify({"message": f"An error occurred: {str(e)}"}), 500

# Update calculate_days_between in subscription.py
def calculate_days_between(start_date, end_date):
    """
    Calculate days between two dates, inclusive of both start and end date
    """
    if not start_date or not end_date:
        return 0
        
    # Ensure both dates are timezone-aware
    start_date = ensure_timezone_aware(start_date)
    end_date = ensure_timezone_aware(end_date)
    
    # Get dates only (removing time component)
    start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    end_date = end_date.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Calculate the difference in days (exact)
    delta = end_date - start_date
    
    # Add 1 for inclusive counting (include both start and end dates)
    return delta.days + 1

def calculate_tier_original_days(tier):
    """Calculate the original days that were used to create this tier"""
    # Get days based on tier's start and end date (not relative to now)
    if tier.start_date and tier.end_date:
        # Use our helper function for consistent calculation WITHOUT any +1 adjustment
        return calculate_days_between(tier.start_date, tier.end_date)
    return 30  # Fallback to default month

# Add this function to consolidate tiers of the same type
def consolidate_subscription_tiers(subscription_id):
    """
    Consolidate all tiers of the same plan type into a single tier
    """
    subscription = SubscriptionModel.query.get(subscription_id)
    if not subscription:
        return
    
    # Get all tiers including the main subscription
    tiers_by_plan = {}
    
    # Include the main subscription as a "tier"
    if subscription.is_active and ensure_timezone_aware(subscription.end_date) > ensure_timezone_aware(datetime.now()):
        tiers_by_plan[subscription.plan_name] = {
            "start_date": subscription.start_date,
            "end_date": subscription.end_date,
            "days": calculate_days_between(subscription.start_date, subscription.end_date),
            "is_main": True
        }
    
    # Get all other tiers
    db_tiers = SubscriptionTierModel.query.filter_by(subscription_id=subscription.id).all()
    
    # Group tiers by plan name
    for tier in db_tiers:
        tier.start_date = ensure_timezone_aware(tier.start_date)
        tier.end_date = ensure_timezone_aware(tier.end_date)
        
        if tier.plan_name in tiers_by_plan:
            # Update existing entry to include this tier
            current = tiers_by_plan[tier.plan_name]
            # Merge the tier periods - take earliest start date and latest end date
            current["start_date"] = min(current["start_date"], tier.start_date)
            current["end_date"] = max(current["end_date"], tier.end_date)
            current["db_tiers"] = current.get("db_tiers", []) + [tier]
        else:
            # Create new entry
            tiers_by_plan[tier.plan_name] = {
                "start_date": tier.start_date,
                "end_date": tier.end_date,
                "days": calculate_days_between(tier.start_date, tier.end_date),
                "is_main": False,
                "db_tiers": [tier]
            }
    
    # Delete all existing tiers
    for tier in db_tiers:
        db.session.delete(tier)
    
    # Recreate consolidated tiers
    tier_order = 1
    for plan_name, plan_data in tiers_by_plan.items():
        # Skip the main subscription since we'll handle it separately
        if plan_data.get("is_main", False) and plan_name == subscription.plan_name:
            continue
            
        # Create new consolidated tier
        new_tier = SubscriptionTierModel(
            subscription_id=subscription.id,
            plan_name=plan_name,
            start_date=plan_data["start_date"],
            end_date=plan_data["end_date"],
            tier_order=tier_order
        )
        db.session.add(new_tier)
        tier_order += 1
    
    # Commit the changes
    db.session.commit()

@subscription_bp.route('/toggle-auto-renew', methods=['POST'])
@jwt_required()
def toggle_auto_renew():
    """Toggle auto-renewal for a subscription"""
    data = request.json
    auto_renew = data.get('autoRenew')
    
    # Get current user and facility
    current_user_id = get_current_user_id()
    user = UserModel.query.get(current_user_id)
    
    if not user or not user.facility_id:
        return jsonify({"message": "No facility associated with user"}), 404
        
    subscription = SubscriptionModel.query.filter_by(facility_id=user.facility_id).first()
    
    if not subscription:
        return jsonify({"message": "No subscription found"}), 404
    
    # Update auto-renewal setting
    subscription.auto_renew = auto_renew
    db.session.commit()
    
    return jsonify({
        "message": f"Auto-renewal has been {'enabled' if auto_renew else 'disabled'}",
        "auto_renew": subscription.auto_renew
    })


