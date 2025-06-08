from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash
from config import db, app
from models_db import UserModel, UserRole, SubscriptionModel, FacilityModel
from flask_jwt_extended import jwt_required, get_jwt_identity  # Import directly from flask_jwt_extended
from sqlalchemy import text
from auth import get_current_user_id, get_current_facility_id, admin_required, check_subscription_limits, super_admin_required  # Add this import
from functools import wraps  # Add this import
from datetime import datetime, timedelta

admin_bp = Blueprint('admin', __name__)

# Helper function to get subscription details for an admin
def get_subscription_for_admin(admin_id):
    # In a real implementation, you would query a Subscriptions table
    # For now, return a mock subscription with limits
    
    # This is a placeholder implementation - replace with actual DB query
    subscription = SubscriptionModel.query.filter_by(user_id=admin_id).first()
    
    # If no subscription found, return a default basic plan
    if not subscription:
        # Mock subscription object
        class MockSubscription:
            def __init__(self):
                self.max_users = 3
                self.plan_name = "Basic"
                self.expiration_date = None
        
        return MockSubscription()
    
    return subscription

# Subscription limit middleware - Make each wrapper function unique
def check_subscription_limits(resource_type):
    def decorator(fn):
        @wraps(fn)  # Add this to preserve function metadata
        @admin_required
        def subscription_check_wrapper(*args, **kwargs):
            current_user_id = get_current_user_id()
            admin = UserModel.query.get(current_user_id)
            
            if not admin:
                return jsonify({"message": "User not found"}), 404
                
            facility_id = admin.facility_id
            
            if not facility_id:
                return jsonify({"message": "Admin not associated with a facility"}), 400
            
            # Get subscription for this facility
            subscription = SubscriptionModel.query.filter_by(facility_id=facility_id).first()
            
            if not subscription or not subscription.is_active or subscription.end_date < datetime.utcnow():
                return jsonify({"message": "Valid subscription required"}), 403
            
            # Check limits based on resource type
            if resource_type == 'users':
                # Count users in this facility
                user_count = UserModel.query.filter_by(facility_id=facility_id).count()
                max_allowed = subscription.max_users
                
                if user_count >= max_allowed:
                    return jsonify({
                        "message": f"Your subscription allows a maximum of {max_allowed} users",
                        "code": "USER_LIMIT_REACHED"
                    }), 403
                    
            elif resource_type == 'racks':
                # Count racks in this facility
                from models_db import RackModel
                rack_count = RackModel.query.filter_by(facility_id=facility_id).count()
                max_allowed = subscription.max_racks
                
                if rack_count >= max_allowed:
                    return jsonify({
                        "message": f"Your subscription allows a maximum of {max_allowed} racks",
                        "code": "RACK_LIMIT_REACHED"
                    }), 403
            
            return fn(*args, **kwargs)
            
        return subscription_check_wrapper
    return decorator

@admin_bp.route('/users', methods=['GET'])
@admin_required
def get_users():
    try:
        current_user_id = get_current_user_id()
        admin_user = UserModel.query.get(current_user_id)
        
        if not admin_user:
            return jsonify({"message": "User not found"}), 404
            
        # Filter users by admin's facility_id
        facility_id = admin_user.facility_id
        print(f"Getting users for facility ID: {facility_id}")
        
        if not facility_id:
            print("Warning: Admin user has no facility_id assigned")
            users = []
        else:
            users = UserModel.query.filter_by(facility_id=facility_id).all()
            print(f"Found {len(users)} users in facility {facility_id}")
        
        return jsonify([
            {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role.value if hasattr(user.role, 'value') else str(user.role)
            }
            for user in users
        ])
        
    except Exception as e:
        print(f"Error getting users: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"message": f"Error getting users: {str(e)}"}), 500

# Keep only the add_user function
@admin_bp.route('/users', methods=['POST'])
@admin_required
@check_subscription_limits('users')
def add_user():
    print("✅ Called add_user function - THIS SHOULD ASSIGN A FACILITY ID")
    try:
        current_user_id = get_current_user_id()
        
        # Get the admin's facility ID directly from their user record
        admin_user = UserModel.query.get(current_user_id)
        if not admin_user or admin_user.role != UserRole.ADMIN:
            return jsonify({"message": "Admin privileges required"}), 403
            
        # Verify admin has a facility_id 
        if not admin_user.facility_id:
            return jsonify({"message": "Admin not associated with any facility"}), 400
        
        facility_id = admin_user.facility_id
        print(f"Adding user to facility ID: {facility_id}")
        
        data = request.json
        
        # Check if username or email already exists
        if UserModel.query.filter_by(username=data['username']).first():
            return jsonify({"message": "Username already exists"}), 400
            
        if UserModel.query.filter_by(email=data['email']).first():
            return jsonify({"message": "Email already exists"}), 400
        
        # Create the new user with the same facility as the admin
        role_value = data['role']
        
        # Normalize role value to uppercase for consistent handling
        if isinstance(role_value, str) and role_value.lower() == 'admin':
            role_value = UserRole.ADMIN
        elif isinstance(role_value, str) and role_value.lower() == 'researcher':
            role_value = UserRole.RESEARCHER
        elif isinstance(role_value, str) and role_value.lower() == 'facility_manager':
            role_value = UserRole.FACILITY_MANAGER
            
        print(f"Creating new user with role: {role_value} in facility: {facility_id}")
        
        new_user = UserModel(
            username=data['username'],
            email=data['email'],
            password=generate_password_hash(data['password']),
            role=role_value,
            created_by=current_user_id,
            facility_id=facility_id  # Use the admin's facility_id
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        print(f"User created: {new_user.id}, {new_user.username}, Facility: {new_user.facility_id}")
        
        return jsonify({
            "message": "User created successfully",
            "id": new_user.id,
            "username": new_user.username,
            "role": str(new_user.role),
            "facility_id": new_user.facility_id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error creating user: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"message": f"Error creating user: {str(e)}"}), 500

@admin_bp.route('/users/<int:user_id>/role', methods=['PUT'])
@admin_required
def update_user_role(user_id):
    data = request.get_json()
    user = UserModel.query.get(user_id)
    
    if not user:
        return jsonify({"msg": "User not found"}), 404
    
    try:
        role_value = data['role']
        print(f"Updating user {user.username} to role: {role_value}")
        
        # Match the role value regardless of case
        if role_value.upper() == 'ADMIN':
            user.role = UserRole.ADMIN
        elif role_value.upper() == 'FACILITY_MANAGER':
            user.role = UserRole.FACILITY_MANAGER
        elif role_value.upper() == 'RESEARCHER':
            user.role = UserRole.RESEARCHER
        else:
            # Default fallback
            user.role = UserRole.RESEARCHER
            
        db.session.commit()
        
        # Verify the change
        db.session.refresh(user)
        print(f"User {user.username} role updated to: {user.role}")
        
        return jsonify({"msg": "User role updated successfully", "role": str(user.role)})
    
    except Exception as e:
        db.session.rollback()
        print(f"Error updating role: {str(e)}")
        return jsonify({"msg": f"Error updating role: {str(e)}"}), 500

# Update the delete_user function in admin.py
@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    user = UserModel.query.get(user_id)
    
    if not user:
        return jsonify({"msg": "User not found"}), 404
    
    # Prevent deleting yourself
    current_user_id = get_current_user_id()
    if current_user_id == user_id:
        return jsonify({"msg": "Cannot delete your own account"}), 403
    
    try:
        username = user.username  # Store for logging
        
        # Handle clinical notes
        from models_db import ClinicalNoteModel
        clinical_notes = ClinicalNoteModel.query.filter_by(user_id=user_id).all()
        
        if clinical_notes:
            print(f"User {username} has {len(clinical_notes)} clinical notes - setting user_id to NULL")
            
            # Set user_id to NULL instead of deleting
            for note in clinical_notes:
                note.user_id = None  # This keeps the note but removes the user association
                
            # Add a system note that indicates the original author was deleted
            author_note = "Note: The original author's account has been deleted."
            for note in clinical_notes:
                if not note.content.endswith(author_note):
                    note.content = f"{note.content}\n\n{author_note}"
        
        # Handle clinical cases
        from models_db import ClinicalCaseModel
        clinical_cases = ClinicalCaseModel.query.filter_by(user_id=user_id).all()
        
        if clinical_cases:
            print(f"User {username} has {len(clinical_cases)} clinical cases - setting user_id to NULL")
            
            # Set user_id to NULL instead of deleting
            for case in clinical_cases:
                case.user_id = None  # This keeps the case but removes the user association
                
                # Add a note to the case about the deletion
                if case.note:
                    case.note = f"{case.note}\n\nNote: The original reporter's account has been deleted."
                else:
                    case.note = "Note: The original reporter's account has been deleted."
        
        # Handle notifications - NEW CODE
        from models_db import NotificationModel
        notifications = db.session.execute(text(f"SELECT * FROM notifications WHERE user_id = {user_id}")).fetchall()
        
        if notifications:
            print(f"User {username} has {len(notifications)} notifications - deleting them")
            # Delete notifications directly with SQL to avoid ORM issues
            db.session.execute(text(f"DELETE FROM notifications WHERE user_id = {user_id}"))
        
        # Handle subscriptions
        from models_db import SubscriptionModel
        subscriptions = SubscriptionModel.query.filter_by(user_id=user_id).all()
        
        if subscriptions:
            print(f"User {username} has {len(subscriptions)} subscription records - deleting them")
            
            # Delete subscriptions
            for subscription in subscriptions:
                db.session.delete(subscription)
        
        # Now delete the user
        db.session.delete(user)
        db.session.commit()
        
        print(f"Deleted user: {username} (ID: {user_id})")
        
        return jsonify({
            "msg": f"User deleted successfully. " +
                   f"{len(clinical_notes) if clinical_notes else 0} clinical notes and " +
                   f"{len(clinical_cases) if clinical_cases else 0} clinical cases preserved."
        }), 200
    
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting user: {str(e)}")
        import traceback
        traceback.print_exc()  # Add this for more detailed error info
        return jsonify({"msg": f"Error deleting user: {str(e)}"}), 500

def modify_clinical_notes_table():
    with app.app_context():
        try:
            # Alter the column to allow NULL values
            db.session.execute(text(
                "ALTER TABLE clinical_notes ALTER COLUMN user_id DROP NOT NULL"
            ))
            db.session.commit()
            print("Modified clinical_notes table to allow NULL user_id values")
        except Exception as e:
            db.session.rollback()
            print(f"Error modifying clinical_notes table: {e}")

@admin_bp.route('/facilities', methods=['GET'])
@jwt_required()
@super_admin_required
def get_all_facilities():
    """Get all facilities (super admin only)"""
    facilities = FacilityModel.query.all()
    facilities_list = []
    
    for facility in facilities:
        # Get subscription info for this facility
        subscription = SubscriptionModel.query.filter_by(facility_id=facility.id).first()
        
        facility_data = {
            'id': facility.id,
            'name': facility.name,
            'organization': facility.organization,
            'subscription': None
        }
        
        if subscription:
            facility_data['subscription'] = {
                'plan_name': subscription.plan_name,
                'end_date': subscription.end_date.isoformat() if subscription.end_date else None,
                'is_valid': subscription.is_active and subscription.end_date > datetime.utcnow(),
                'max_users': subscription.max_users,
                'max_racks': subscription.max_racks
            }
        
        facilities_list.append(facility_data)
    
    return jsonify({'facilities': facilities_list})

@admin_bp.route('/subscription/extend', methods=['POST'])
@jwt_required()
@super_admin_required
def admin_extend_subscription():
    """Special endpoint for super admins to extend subscriptions without payment"""
    data = request.json
    facility_id = data.get('facility_id')
    days = data.get('days', 30)
    plan = data.get('plan', 'PREMIUM')
    
    if not facility_id:
        return jsonify({"message": "Facility ID is required"}), 400
    
    # Get the facility
    facility = FacilityModel.query.get(facility_id)
    if not facility:
        return jsonify({"message": "Facility not found"}), 404
    
    # Get or create subscription
    subscription = SubscriptionModel.query.filter_by(facility_id=facility_id).first()
    
    from subscription import get_plan_limits
    
    if not subscription:
        subscription = SubscriptionModel(
            facility_id=facility_id,
            user_id=None,  # This is an admin override
            plan_name=plan,
            start_date=datetime.utcnow(),
            end_date=datetime.utcnow() + timedelta(days=days),
            max_users=get_plan_limits(plan)["max_users"],
            max_racks=get_plan_limits(plan)["max_racks"],
            is_active=True,
            payment_id="admin_override"
        )
        db.session.add(subscription)
    else:
        # Extend existing subscription
        if subscription.is_active and subscription.end_date > datetime.utcnow():
            subscription.end_date = subscription.end_date + timedelta(days=days)
        else:
            subscription.start_date = datetime.utcnow()
            subscription.end_date = datetime.utcnow() + timedelta(days=days)
            
        # Update plan if specified
        if plan and plan != subscription.plan_name:
            subscription.plan_name = plan
            subscription.max_users = get_plan_limits(plan)["max_users"]
            subscription.max_racks = get_plan_limits(plan)["max_racks"]
            
        subscription.is_active = True
        subscription.payment_id = "admin_override"
    
    # Create a new subscription tier with the correct dates
    new_tier = SubscriptionTierModel(
        subscription_id=subscription.id,
        plan_name=plan,
        start_date=subscription.start_date,
        end_date=subscription.end_date,  # This should be the new end date after extension
        tier_order=0
    )
    db.session.add(new_tier)
    db.session.commit()
    
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

@admin_bp.route('/extend', methods=['POST'])
@admin_required
def facility_extend_subscription():  # Changed from admin_extend_subscription to facility_extend_subscription
    try:
        data = request.json
        days = data.get('days', 30)
        plan = data.get('plan', 'BASIC')
        facility_id = data.get('facility_id')
        
        subscription = SubscriptionModel.query.filter_by(facility_id=facility_id).first()
        
        if not subscription:
            return jsonify({"message": "Subscription not found"}), 404
            
        # Calculate new dates
        if subscription.is_active and subscription.end_date > datetime.utcnow():
            new_end_date = subscription.end_date + timedelta(days=days)
        else:
            new_end_date = datetime.utcnow() + timedelta(days=days)
            
        # Update subscription
        subscription.end_date = new_end_date
        subscription.is_active = True
        
        db.session.commit()
        
        return jsonify({
            "message": "Subscription extended successfully",
            "subscription": {
                "facility_id": subscription.facility_id,
                "end_date": subscription.end_date.isoformat(),
                "is_active": subscription.is_active
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print("Error in facility_extend_subscription:", str(e))
        return jsonify({"message": f"Server error: {str(e)}"}), 500

if __name__ == "__main__":
    modify_clinical_notes_table()