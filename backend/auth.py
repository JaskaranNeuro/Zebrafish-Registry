from flask import Blueprint, request, jsonify, make_response
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, create_refresh_token, get_jwt, set_access_cookies, set_refresh_cookies, JWTManager
from werkzeug.security import generate_password_hash, check_password_hash
from models_db import UserModel, UserRole, FacilityModel
from config import app, db, jwt
from datetime import timedelta
from functools import wraps
from flask_jwt_extended import jwt_required
from flask import jsonify
from models_db import SubscriptionModel, UserModel
from datetime import datetime
import uuid

# Create a Blueprint
auth_bp = Blueprint('auth', __name__)

# No need to initialize JWT here - it's already done in config.py
# Remove these lines:
# jwt = JWTManager(app)
# app.config['JWT_SECRET_KEY'] = 'your-secret-key'  
# app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

# Update these functions in auth.py

def get_current_user_id():
    try:
        # The identity is now just the user_id as a string
        identity = get_jwt_identity()
        print(f"JWT identity in get_current_user_id: {identity}, type: {type(identity)}")
        
        # Simple conversion since identity should be a string containing the user ID
        if identity is not None:
            user_id = int(identity)
            print(f"Converted user_id: {user_id}")
            return user_id
            
        return 0
        
    except Exception as e:
        print(f"ERROR in get_current_user_id: {e}")
        import traceback
        traceback.print_exc()
        return 0

def get_current_facility_id():
    try:
        # Get the facility_id from the additional claims
        from flask_jwt_extended import get_jwt
        claims = get_jwt()  # This gets all the claims in the token
        
        # Check if facility_id is in the claims
        if 'facility_id' in claims:
            facility_id = claims['facility_id']
            print(f"Found facility_id in JWT claims: {facility_id}")
            return facility_id
        
        # Fallback to getting facility from user record
        user_id = get_current_user_id()
        if not user_id:
            print("No valid user ID found")
            return None
            
        # Look up the user's facility
        user = UserModel.query.get(user_id)
        if user and user.facility_id:
            print(f"Found facility_id {user.facility_id} for user ID {user_id}")
            return user.facility_id
            
        print(f"User ID {user_id} has no facility assigned")
        return None
        
    except Exception as e:
        print(f"ERROR in get_current_facility_id: {e}")
        import traceback
        traceback.print_exc()
        return None

def role_required(*roles):
    def wrapper(fn):
        @wraps(fn)
        @jwt_required()
        def decorator(*args, **kwargs):
            current_user_id = get_current_user_id()
            user = UserModel.query.get(current_user_id)
            if not user or user.role not in roles:
                return jsonify({"message": "Insufficient permissions"}), 403
            return fn(*args, **kwargs)
        return decorator
    return wrapper

# Update your login function in auth.py to include facility_id in the token
@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        # Find the user by username
        user = UserModel.query.filter_by(username=data['username']).first()
        
        # Check if user exists and password is correct
        if not user or not check_password_hash(user.password, data['password']):
            return jsonify({"message": "Invalid username or password"}), 401
            
        # Create token with user_id as a string (this is the subject)
        # Store facility_id as a claim instead
        access_token = create_access_token(
            identity=str(user.id),  # Use string user_id as the subject
            additional_claims={     # Add facility_id as a claim
                'facility_id': user.facility_id
            }
        )
        
        # Include facility info in the response
        facility_info = None
        if user.facility_id:
            facility = FacilityModel.query.get(user.facility_id)
            if facility:
                facility_info = {
                    "id": facility.id,
                    "name": facility.name,
                    "organization": facility.organization_name
                }
                
            print(f"User {user.username} (ID: {user.id}) logged in with facility: {facility.name if facility else 'None'} (ID: {user.facility_id})")
        else:
            print(f"User {user.username} (ID: {user.id}) logged in with NO facility assigned!")
        
        return jsonify({
            "message": "Login successful",
            "access_token": access_token,
            "user_id": user.id,
            "role": user.role.value if hasattr(user.role, 'value') else str(user.role),
            "facility": facility_info
        }), 200
        
    except Exception as e:
        print(f"Login error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"message": f"Login error: {str(e)}"}), 500

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if UserModel.query.filter_by(username=data['username']).first():
        return jsonify({"message": "Username already exists"}), 400
        
    if UserModel.query.filter_by(email=data['email']).first():
        return jsonify({"message": "Email already exists"}), 400
        
    new_user = UserModel(
        username=data['username'],
        email=data['email'],
        password=generate_password_hash(data['password']),
        role=UserRole[data['role'].upper()] if 'role' in data else UserRole.RESEARCHER
    )
    
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({"message": "User created successfully"}), 201

@auth_bp.route('/user', methods=['GET'])
@jwt_required()
def get_user():
    current_user_id = get_current_user_id()
    user = UserModel.query.get(current_user_id)
    
    if not user:
        return jsonify({"message": "User not found"}), 404
        
    print(f"User info requested. User ID: {user.id}, Role: {user.role}")
    
    facility_info = None
    if user.facility_id:
        facility = FacilityModel.query.get(user.facility_id)
        if facility:
            facility_info = {
                "id": facility.id,
                "name": facility.name,
                "organization": facility.organization_name
            }
    
    return jsonify({
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role.value if hasattr(user.role, 'value') else str(user.role),
        "facility": facility_info
    }), 200

@auth_bp.route('/users/researchers', methods=['GET'])
@jwt_required()
def get_researchers():
    current_user_id = get_current_user_id()
    user = UserModel.query.get(current_user_id)
    
    if not user or user.role != UserRole.ADMIN:
        return jsonify({"message": "Admin privileges required"}), 403
        
    researchers = UserModel.query.filter_by(role=UserRole.RESEARCHER).all()
    return jsonify([{
        'id': r.id,
        'username': r.username,
        'email': r.email
    } for r in researchers])

@auth_bp.route('/check-admin', methods=['GET'])
@jwt_required()
def check_admin():
    current_user_id = get_current_user_id()
    user = UserModel.query.get(current_user_id)
    
    if not user:
        return jsonify({"message": "User not found"}), 404
        
    # Check if the user has ADMIN role
    is_admin = user.role == UserRole.ADMIN
    
    # Get raw role value for debugging
    role_value = user.role.value if hasattr(user.role, 'value') else str(user.role)
    role_type = str(type(user.role))
    
    # Debug info
    print(f"User: {user.username}, ID: {user.id}")
    print(f"Role type: {role_type}")
    print(f"Role direct: {user.role}")
    print(f"Role value: {role_value}")
    print(f"Is admin? {is_admin}")
    
    return jsonify({
        "username": user.username,
        "id": user.id,
        "role": role_value,
        "role_type": role_type,
        "is_admin": is_admin
    }), 200

# Add to auth.py
from functools import wraps
from flask import jsonify
from models_db import SubscriptionModel

def subscription_required(fn):
    """Decorator to check if user's facility has a valid subscription"""
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        try:
            current_user_id = get_current_user_id()
            user = UserModel.query.get(current_user_id)
            
            if not user or not user.facility_id:
                return jsonify({"message": "No facility associated with user"}), 403
                
            subscription = SubscriptionModel.query.filter_by(facility_id=user.facility_id).first()
            
            if not subscription:
                return jsonify({
                    "message": "No subscription found for this facility",
                    "code": "NO_SUBSCRIPTION"
                }), 403
                
            if not subscription.is_active or subscription.end_date < datetime.utcnow():
                return jsonify({
                    "message": "Your subscription has expired",
                    "code": "SUBSCRIPTION_EXPIRED"
                }), 403
                
            return fn(*args, **kwargs)
            
        except Exception as e:
            print(f"Error in subscription validation: {str(e)}")
            return jsonify({"message": "Error validating subscription"}), 500
            
    wrapper.__name__ = fn.__name__  # Preserve original function name
    return wrapper

def check_subscription_limits(resource_type):
    """
    Decorator to check if the facility has reached its subscription limits
    resource_type: 'users' or 'racks'
    """
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            try:
                current_user_id = get_current_user_id()
                user = UserModel.query.get(current_user_id)
                
                if not user or not user.facility_id:
                    return jsonify({"message": "No facility associated with user"}), 403
                    
                subscription = SubscriptionModel.query.filter_by(facility_id=user.facility_id).first()
                
                if not subscription or not subscription.is_active or subscription.end_date < datetime.utcnow():
                    return jsonify({"message": "Valid subscription required"}), 403
                
                facility_id = user.facility_id
                
                if resource_type == 'users':
                    # Count users in this facility
                    current_count = UserModel.query.filter_by(facility_id=facility_id).count()
                    max_allowed = subscription.max_users
                    
                    if current_count >= max_allowed:
                        return jsonify({
                            "message": f"Your subscription allows a maximum of {max_allowed} users",
                            "code": "USER_LIMIT_REACHED"
                        }), 403
                
                elif resource_type == 'racks':
                    # Count racks in this facility
                    from models_db import RackModel
                    current_count = RackModel.query.filter_by(facility_id=facility_id).count()
                    max_allowed = subscription.max_racks
                    
                    if current_count >= max_allowed:
                        return jsonify({
                            "message": f"Your subscription allows a maximum of {max_allowed} racks",
                            "code": "RACK_LIMIT_REACHED"
                        }), 403
                
                return fn(*args, **kwargs)
                
            except Exception as e:
                print(f"Error checking subscription limits: {str(e)}")
                return jsonify({"message": "Error checking subscription limits"}), 500
                
        wrapper.__name__ = fn.__name__  # Preserve original function name
        return wrapper
    return decorator

def admin_required(fn):
    """Decorator to verify user is an admin"""
    @wraps(fn)
    @jwt_required()
    def admin_auth_wrapper(*args, **kwargs):
        current_user_id = get_current_user_id()
        user = UserModel.query.get(current_user_id)
        
        if not user or user.role != UserRole.ADMIN:
            return jsonify({"message": "Admin privileges required"}), 403
            
        return fn(*args, **kwargs)
    return admin_auth_wrapper

from flask import jsonify
from flask_jwt_extended import jwt_required
from models_db import UserModel, UserRole
from functools import wraps

# Add to your auth.py

from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity

def super_admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user_id = get_jwt_identity()
        is_super = False
        
        try:
            # Check if is_super_admin column exists and is True
            from sqlalchemy import text
            result = db.session.execute(text(
                "SELECT is_super_admin FROM users WHERE id = :user_id"
            ), {"user_id": user_id}).fetchone()
            
            is_super = bool(result and result[0])
        except Exception as e:
            print(f"Error checking super admin status: {e}")
            return jsonify({"msg": "Error checking admin privileges"}), 500
        
        if not is_super:
            return jsonify({"msg": "Super admin privileges required"}), 403
        return fn(*args, **kwargs)
    return wrapper

# Add this route to auth_bp in your auth.py file

@auth_bp.route('/check-super-admin', methods=['GET'])
@jwt_required()
def check_super_admin():
    user_id = get_jwt_identity()
    
    # Check if is_super_admin column exists and is True using direct SQL
    from sqlalchemy import text
    result = db.session.execute(text(
        "SELECT is_super_admin FROM users WHERE id = :user_id"
    ), {"user_id": user_id}).fetchone()
    
    is_super_admin = result[0] if result else False
    
    return jsonify({
        "is_super_admin": is_super_admin
    }), 200

@auth_bp.route('/debug-admin-status', methods=['GET'])
@jwt_required()
def debug_admin_status():
    user_id = get_jwt_identity()
    
    # Get user details from database
    user = UserModel.query.get(user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    return jsonify({
        "username": user.username,
        "user_id": user.id,
        "is_super_admin": bool(getattr(user, "is_super_admin", False)),
        "role": user.role
    }), 200

# Update JWT configuration
def configure_jwt(app):
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(minutes=15)  # Short-lived access token
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)    # Long-lived refresh token
    app.config['JWT_COOKIE_SECURE'] = False  # Set to True in production
    app.config['JWT_COOKIE_CSRF_PROTECT'] = True
    app.config['JWT_TOKEN_LOCATION'] = ['headers', 'cookies']
    app.config['JWT_COOKIE_SAMESITE'] = 'Lax'  # Prevents CSRF
    
    # Initialize JWT with the app
    jwt = JWTManager(app)
    
    # Add token blocklist for logout functionality
    app.config['JWT_BLOCKLIST_ENABLED'] = True
    app.config['JWT_BLOCKLIST_TOKEN_CHECKS'] = ['access', 'refresh']
    
    # In-memory blocklist (replace with Redis in production)
    BLOCKLIST = set()
    
    @jwt.token_in_blocklist_loader
    def check_if_token_in_blocklist(jwt_header, jwt_payload):
        jti = jwt_payload['jti']
        return jti in BLOCKLIST
    
    return BLOCKLIST

# Add a refresh token endpoint
@auth_bp.route('/api/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh_token():
    try:
        # Get identity from refresh token
        identity = get_jwt_identity()
        user = UserModel.query.get(identity)
        
        # Generate new access token
        access_token = create_access_token(
            identity=identity,
            additional_claims={
                'facility_id': user.facility_id,
                'role': user.role.value if hasattr(user.role, 'value') else str(user.role)
            }
        )
        
        return jsonify({"access_token": access_token}), 200
    except Exception as e:
        return jsonify({"message": f"Error refreshing token: {str(e)}"}), 500

# Add secure logout with token invalidation
@auth_bp.route('/api/logout', methods=['POST'])
@jwt_required()
def logout():
    try:
        jti = get_jwt()["jti"]
        BLOCKLIST.add(jti)
        
        # Clear cookies
        response = jsonify({"message": "Logged out successfully"})
        response.delete_cookie('refresh_token_cookie')
        
        return response, 200
    except Exception as e:
        return jsonify({"message": f"Error logging out: {str(e)}"}), 500

# Add this function to help with token debugging
@auth_bp.route('/api/debug-token', methods=['GET'])
@jwt_required()
def debug_token():
    """Debug endpoint to check token validity"""
    try:
        identity = get_jwt_identity()
        claims = get_jwt()
        
        return jsonify({
            "identity": identity,
            "claims": {k: v for k, v in claims.items() if k not in ['exp', 'iat']}
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500