from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash
from config import db
from models_db import UserModel, UserRole, SubscriptionModel, FacilityModel
from flask_jwt_extended import jwt_required, get_jwt_identity, create_access_token
from datetime import datetime, timedelta

tenant_bp = Blueprint('tenant', __name__)

@tenant_bp.route('/register-facility', methods=['POST'])
def register_facility():
    data = request.get_json()
    
    try:
        # Check if username or email already exists
        existing_user = UserModel.query.filter(
            (UserModel.username == data['admin']['username']) |
            (UserModel.email == data['admin']['email'])
        ).first()
        
        if existing_user:
            return jsonify({
                "message": "Username or email already exists. Please choose a different one."
            }), 400
        
        # Create a new facility
        new_facility = FacilityModel(
            name=data['facilityName'],
            organization_name=data['organizationName']
        )
        db.session.add(new_facility)
        db.session.flush()  # Get the ID without committing
        
        print(f"Created new facility with ID: {new_facility.id}")
        
        # Create admin user for this facility
        admin_user = UserModel(
            username=data['admin']['username'],
            email=data['admin']['email'],
            password=generate_password_hash(data['admin']['password']),
            role=UserRole.ADMIN,
            facility_id=new_facility.id  # Link to the facility
        )
        db.session.add(admin_user)
        db.session.flush()  # This line is crucial - we need the admin_user.id before creating the subscription
        
        print(f"Created admin user with ID: {admin_user.id} for facility ID: {new_facility.id}")
        
        # Create default subscription
        trial_end_date = datetime.utcnow() + timedelta(days=30)
        subscription = SubscriptionModel(
            facility_id=new_facility.id,
            user_id=admin_user.id,  # Add this line to set the user_id
            plan_name="TRIAL",
            start_date=datetime.utcnow(),
            end_date=trial_end_date,
            max_users=2,  # Trial plan limits
            max_racks=3,
            is_active=True
        )
        db.session.add(subscription)
        db.session.commit()
        print(f"Successfully registered new facility '{data['facilityName']}' with admin '{data['admin']['username']}'")
        
        # Create access token for the new admin user
        jwt_payload = {
            'user_id': str(admin_user.id),
            'facility_id': new_facility.id
        }
        access_token = create_access_token(identity=jwt_payload)
        
        return jsonify({
            "message": "Facility and admin account created successfully", 
            "facilityId": new_facility.id,
            "adminId": admin_user.id,
            "accessToken": access_token
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error in register_facility: {str(e)}")
        return jsonify({"message": f"Error creating facility: {str(e)}"}), 500