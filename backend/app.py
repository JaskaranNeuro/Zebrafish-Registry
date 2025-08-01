# At the beginning of your app.py
# At the top of your app.py or config.py
from dotenv import load_dotenv
import os

# Load .env file if it exists (for local development)
if os.path.exists('.env'):
    load_dotenv()

if not os.path.exists("logs"):
    os.makedirs("logs")
from flask import Flask, jsonify, request, make_response
from flask_jwt_extended import (
    jwt_required, 
    get_jwt_identity,  # Add this import
    create_access_token
)
from flask_cors import CORS
from config import app, db
from models_db import (
    RackModel, 
    TankModel, 
    SubdivisionModel, 
    UserRole, 
    UserModel,
    BreedingProfileModel,
    BreedingPlanModel,
    BreedingCalendarModel,
    CrossModel,
    TankPositionHistoryModel,  # Add this
    ClinicalCaseModel,  # Make sure this is included
    ClinicalNoteModel,  # Make sure this is included
    GenderEnum  # Add this import
)
from auth import role_required  # Add this import
from werkzeug.security import generate_password_hash, check_password_hash  # Add this import
from datetime import datetime  # Add this at the top with other imports
from flask_migrate import Migrate
from sqlalchemy import or_, text  # Also add this import for the database query
from admin import admin_bp
# Import at the top of your app.py file
from auth import auth_bp, jwt_required, get_jwt_identity
# Import at the top
from tenant import tenant_bp
from auth import get_current_user_id, get_current_facility_id
# Add this near the top of app.py with your other imports
from subscription import subscription_bp
# Update in app.py
from auth import jwt_required, get_current_user_id, get_current_facility_id, check_subscription_limits
# Add the import
from webhook_handler import webhook_handler_bp
from webhook import webhook_bp
# Import the notification service at the top of app.py
from notification_service import create_notification
# Add this to your app.py file
from super_admin_routes import super_admin_bp
# Add these imports to app.py
import error_handlers
import csrf
import rate_limit
import audit
from flask import jsonify, request
from datetime import datetime
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from auth import get_current_facility_id
from models_db import BreedingCalendarModel, db
# Add imports at the top
from flask import Flask, jsonify, request, make_response
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
from config import app, db
from models_db import UserModel, FacilityModel
# Import security components
from auth import configure_jwt, auth_bp
from csrf import csrf_bp, csrf_required
from rate_limit import configure_limiter
from audit import log_audit, audit_route
from security_headers import add_security_headers
from error_handlers import register_error_handlers
import schemas


# Configure proper CORS to allow frontend connections
CORS(app, 
    resources={r"/api/*": {
        "origins": [
            "https://zefitrack.netlify.app",
            "https://zebrafishregistry.web.app",
            "https://zebrafishregistry.firebaseapp.com",
            "http://localhost:3000"
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }}
)

# CORS configured in config.py  # Add this line after creating the Flask app

# After creating the app and db
migrate = Migrate(app, db)

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api')
app.register_blueprint(admin_bp, url_prefix='/api/admin')
app.register_blueprint(tenant_bp, url_prefix='/api')  # Register tenant blueprint
# Add this with your other blueprint registrations
app.register_blueprint(subscription_bp, url_prefix='/api/subscription')
# Register the blueprint
app.register_blueprint(webhook_handler_bp, url_prefix='/api/webhook-handler')
app.register_blueprint(webhook_bp, url_prefix='/api/webhook')
# Register the blueprint
app.register_blueprint(super_admin_bp, url_prefix='/api/super-admin')


# Existing racks route
@app.route('/api/racks', methods=['GET'])
@jwt_required()
def get_racks():
    try:
        facility_id = get_current_facility_id()
        print(f"Current facility ID for racks request: {facility_id}")
        racks = RackModel.query.filter_by(facility_id=facility_id).all()
        data = []
        for rack in racks:
            # Manual serialization of rack
            rack_data = {
                "id": rack.id,
                "name": rack.name,
                "lab_id": rack.lab_id,
                "rows": rack.rows,
                "columns": rack.columns,
                "row_configs": rack.row_configs,
                "facility_id": rack.facility_id,
                "tanks": []  # Initialize tanks array
            }
            
            # Get tanks for this rack
            tanks = TankModel.query.filter_by(rack_id=rack.id).all()
            print(f"Found {len(tanks)} tanks for rack {rack.id}")
            
            for tank in tanks:
                # Manual serialization of tank
                tank_data = {
                    "id": tank.id,
                    "position": tank.position,
                    "size": tank.size.value if hasattr(tank.size, 'value') else str(tank.size),
                    "line": tank.line,
                    "dob": tank.dob.isoformat() if tank.dob else None,
                    "color": tank.color,
                    "rack_id": tank.rack_id,
                    "subdivisions": []
                }
                
                # Add subdivisions to tank
                for sub in tank.subdivisions:
                    sub_data = {
                        "id": sub.id,
                        "tank_id": sub.tank_id,
                        "gender": sub.gender.value if hasattr(sub.gender, 'value') else str(sub.gender),
                        "count": sub.count
                    }
                    tank_data["subdivisions"].append(sub_data)
                
                rack_data["tanks"].append(tank_data)
            
            data.append(rack_data)
            
        print(f"Returning {len(data)} racks with tanks")
        return jsonify(data)
    except Exception as e:
        print(f"Error in get_racks: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/racks', methods=['POST'])
@jwt_required()
@check_subscription_limits('racks')  # Add this line
def create_rack():
    try:
        facility_id = get_current_facility_id()
        
        if (facility_id is None):
            return jsonify({"message": "No facility associated with your account"}), 400
        
        data = request.json
        
        # Set default values
        rack = RackModel(
            name=data['name'],
            lab_id=data.get('lab_id') or f"Lab-{facility_id}",  # Use facility ID if no lab ID provided
            rows=data.get('rows') or 4,  # Default to 4 rows
            columns=data.get('columns') or 6,  # Default to 6 columns
            row_configs=data.get('row_configs') or {},
            facility_id=facility_id  # Always set facility_id
        )
        
        db.session.add(rack)
        db.session.commit()
        
        return jsonify({
            'id': rack.id,
            'name': rack.name,
            'lab_id': rack.lab_id,
            'dimensions': f"{rack.rows}x{rack.columns}",
            'row_configs': rack.row_configs
        }), 201
    except Exception as e:
        db.session.rollback()
        print("Error creating rack:", str(e))
        return jsonify({'message': str(e)}), 500

@app.route('/api/racks/<int:rack_id>/row-config', methods=['PUT'])
@jwt_required()
def update_rack_row_config(rack_id):
    try:
        data = request.json
        print("Backend: Received request data:", data)
        print("Backend: Rack ID:", rack_id)
        
        rack = RackModel.query.get_or_404(rack_id)
        print("Backend: Found rack:", {
            'id': rack.id,
            'name': rack.name,
            'current_configs': rack.row_configs
        })
        
        # Validate and convert row configs
        row_configs = data.get('row_configs', {})
        validated_configs = {
            str(k): int(v) 
            for k, v in row_configs.items() 
            if v is not None and int(v) > 0
        }
        
        print("Backend: Validated configs to save:", validated_configs)
        
        # Update row configuration
        rack.row_configs = validated_configs
        db.session.commit()
        
        # Verify the update
        db.session.refresh(rack)
        print("Backend: Updated rack configs in DB:", rack.row_configs)
        
        response_data = {
            'id': rack.id,
            'name': rack.name,
            'lab_id': rack.lab_id,
            'dimensions': f"{rack.rows}x{rack.columns}",
            'row_configs': rack.row_configs or {},  # Ensure it's not None
            'tanks': [{
                'id': tank.id,
                'position': tank.position,
                'size': tank.size.value,
                'line': tank.line,
                'dob': tank.dob.isoformat() if tank.dob else None,
                'color': tank.color,
                'subdivisions': [{
                    'gender': sub.gender.value,
                    'count': sub.count
                } for sub in tank.subdivisions]
            } for tank in rack.tanks]
        }
        
        print("Backend: Sending response:", response_data)
        return jsonify(response_data)

    except Exception as e:
        db.session.rollback()
        print("Backend Error:", str(e))
        return jsonify({'message': str(e)}), 400

# Add your new tank routes here
@app.route('/api/tanks', methods=['POST'])
@jwt_required()
def create_tank():
    try:
        data = request.json
        facility_id = get_current_facility_id()
        
        # Verify the rack belongs to the current facility
        rack = RackModel.query.get_or_404(data['rack_id'])
        if facility_id and rack.facility_id != facility_id:
            return jsonify({"message": "You can only create tanks in your facility's racks"}), 403
        
        new_tank = TankModel(
            rack_id=data['rack_id'],
            position=data['position'],
            size=data['size'].upper(),
            line=data.get('line'),
            dob=datetime.strptime(data['dob'], '%Y-%m-%d').date() if data.get('dob') else None,
            color=data.get('color', '#bbdefb')
        )
        
        for sub_data in data.get('subdivisions', []):
            sub = SubdivisionModel(
                gender=sub_data['gender'].upper(),
                count=sub_data['count']
            )
            new_tank.subdivisions.append(sub)
        
        db.session.add(new_tank)
        db.session.commit()
        
        return jsonify({
            'id': new_tank.id,
            'position': new_tank.position,
            'size': new_tank.size.value,
            'line': new_tank.line,
            'dob': new_tank.dob.isoformat() if new_tank.dob else None,
            'color': new_tank.color,
            'subdivisions': [{
                'gender': sub.gender.value,
                'count': sub.count
            } for sub in new_tank.subdivisions]
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print("Error creating tank:", str(e))
        return jsonify({'message': str(e)}), 422

@app.route('/api/tanks/<int:tank_id>', methods=['PUT'])
@jwt_required()
def update_tank(tank_id):
    try:
        data = request.json
        tank = TankModel.query.get_or_404(tank_id)
        
        # Update tank properties
        if 'size' in data:
            tank.size = data['size'].upper()
        if 'line' in data:
            tank.line = data.get('line')
        if 'dob' in data:
            tank.dob = datetime.strptime(data['dob'], '%Y-%m-%d').date() if data.get('dob') else None
        if 'color' in data:  # Add this block
            tank.color = data.get('color')
        
        # Update subdivisions
        if 'subdivisions' in data:
            SubdivisionModel.query.filter_by(tank_id=tank_id).delete()
            for sub_data in data['subdivisions']:
                sub = SubdivisionModel(
                    tank_id=tank_id,
                    gender=sub_data['gender'].upper(),
                    count=sub_data['count']
                )
                db.session.add(sub)
        
        db.session.commit()
        return jsonify({
            'id': tank.id,
            'position': tank.position,
            'size': tank.size.value,
            'line': tank.line,
            'dob': tank.dob.isoformat() if tank.dob else None,
            'color': tank.color,  # Include color in response
            'subdivisions': [{
                'gender': sub.gender.value,
                'count': sub.count
            } for sub in tank.subdivisions]
        })
    except Exception as e:
        db.session.rollback()
        print("Error updating tank:", str(e))
        return jsonify({'message': str(e)}), 500

# Existing tank position route
@app.route('/api/tanks/<tank_id>/position', methods=['PUT'])
@jwt_required()
def update_tank_position(tank_id):
    data = request.json
    tank = TankModel.query.get_or_404(tank_id)
    tank.position = data['position']
    db.session.commit()
    return jsonify({'message': 'Tank position updated'})

@app.route('/api/tanks/<int:tank_id>/move', methods=['POST'])
@jwt_required()
def move_tank(tank_id):
    data = request.json
    new_rack_id = data.get('rack_id')
    new_position = data.get('position')
    
    try:
        with db.session.begin_nested():
            tank = TankModel.query.get_or_404(tank_id)
            
            # Close current position history entry
            current_position = TankPositionHistoryModel.query.filter_by(
                tank_id=tank_id, 
                end_date=None
            ).first()
            
            if current_position:
                current_position.end_date = datetime.utcnow()
            
            # Create new position history entry
            new_position_history = TankPositionHistoryModel(
                tank_id=tank_id,
                position=new_position,
                rack_id=new_rack_id,
                start_date=datetime.utcnow()
            )
            db.session.add(new_position_history)
            
            # Update tank
            tank.rack_id = new_rack_id
            tank.position = new_position
            
        db.session.commit()
        return jsonify({'message': 'Tank moved successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 400

@app.route('/api/racks/<int:rack_id>', methods=['DELETE'])
@jwt_required()
def delete_rack(rack_id):
    try:
        rack = RackModel.query.get_or_404(rack_id)
        # Delete all tanks and their subdivisions first
        for tank in rack.tanks:
            SubdivisionModel.query.filter_by(tank_id=tank.id).delete()
        TankModel.query.filter_by(rack_id=rack_id).delete()
        db.session.delete(rack)
        db.session.commit()
        return jsonify({'message': 'Rack deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 400

@app.route('/api/tanks/<int:tank_id>', methods=['DELETE'])
@jwt_required()
def delete_tank(tank_id):
    try:
        print(f"Attempting to delete tank with ID: {tank_id}")
        tank = TankModel.query.get_or_404(tank_id)
        
        # Delete all subdivisions first
        SubdivisionModel.query.filter_by(tank_id=tank_id).delete()
        
        # Then delete the tank
        db.session.delete(tank)
        db.session.commit()
        
        return jsonify({'message': 'Tank deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting tank: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'message': str(e)}), 500

@app.route('/api/search/tanks', methods=['POST'])
@jwt_required()
def search_tanks():
    try:
        data = request.json
        query = TankModel.query

        # Handle rack-specific search
        if data.get('rack_id'):
            query = query.filter(TankModel.rack_id == data['rack_id'])

        # Handle search parameters
        search_terms = data.get('searchTerms', [])
        operator = data.get('operator', 'AND').upper()

        if search_terms:
            filters = []
            for term in search_terms:
                field = term.get('field')
                value = term.get('value')
                if field and value:
                    if field == 'line':
                        filters.append(TankModel.line.ilike(f'%{value}%'))
                    elif field == 'dob':
                        try:
                            date = datetime.strptime(value, '%Y-%m-%d').date()
                            filters.append(TankModel.dob == date)
                        except ValueError:
                            continue
                    elif field == 'size':
                        filters.append(TankModel.size == value.upper())
                    elif field == 'position':
                        filters.append(TankModel.position.ilike(f'%{value}%'))
                    elif field == 'gender':
                        filters.append(TankModel.subdivisions.any(
                            SubdivisionModel.gender == value.upper()
                        ))
                    elif field == 'count':
                        try:
                            count = int(value)
                            filters.append(TankModel.subdivisions.any(
                                SubdivisionModel.count >= count
                            ))
                        except ValueError:
                            continue

            if filters:
                if operator == 'AND':
                    query = query.filter(db.and_(*filters))
                else:  # OR
                    query = query.filter(db.or_(*filters))

        results = {}
        tanks = query.all()
        
        for tank in tanks:
            rack = tank.rack
            if rack.id not in results:
                results[rack.id] = {
                    'rack_name': rack.name,
                    'lab_id': rack.lab_id,
                    'tanks': []
                }
            
            results[rack.id]['tanks'].append({
                'id': tank.id,
                'position': tank.position,
                'size': tank.size.value,
                'line': tank.line,
                'dob': tank.dob.isoformat() if tank.dob else None,
                'color': tank.color,
                'subdivisions': [{
                    'gender': sub.gender.value,
                    'count': sub.count
                } for sub in tank.subdivisions]
            })

        return jsonify(results)

    except Exception as e:
        print("Search error:", str(e))
        return jsonify({'message': str(e)}), 400

@app.route('/api/tanks/color-mapping', methods=['POST'])
@jwt_required()
def update_tank_colors():
    try:
        data = request.json
        mapping_type = data['type']
        rack_id = data.get('rackId')
        value = data['value']
        color = data.get('color')
        
        # Build query based on mapping type and rack selection
        query = TankModel.query
        if rack_id:
            query = query.filter_by(rack_id=rack_id)
            
        if mapping_type == 'line':
            # Update tanks with matching line
            tanks = query.filter_by(line=value).all()
            for tank in tanks:
                tank.color = color
                
        elif mapping_type == 'gender':
            if value == 'MALE_FEMALE':
                # Find tanks with male, female, or both
                tanks = query.join(SubdivisionModel).filter(
                    db.or_(
                        SubdivisionModel.gender == 'MALE',
                        SubdivisionModel.gender == 'FEMALE'
                    )
                ).distinct().all()
                for tank in tanks:
                    tank.color = color
            else:
                # Find tanks with specific gender
                tanks = query.join(SubdivisionModel).filter(
                    SubdivisionModel.gender == value
                ).all()
                for tank in tanks:
                    tank.color = color
        
        db.session.commit()
        return jsonify({'message': 'Colors updated successfully'})
        
    except Exception as e:
        db.session.rollback()
        print("Error updating colors:", str(e))
        return jsonify({'message': str(e)}), 500

@app.route('/api/tanks/swap-positions', methods=['POST'])
@jwt_required()
def swap_tank_positions():
    try:
        data = request.json
        tank1 = TankModel.query.get_or_404(data['tank1Id'])
        tank2 = TankModel.query.get_or_404(data['tank2Id'])
        
        # Debug log
        print(f"Swapping tanks: {tank1.id} (position {tank1.position}) with {tank2.id} (position {tank2.position})")
        
        # Normalize sizes for comparison
        size1 = tank1.size.value.upper() if tank1.size else 'REGULAR'
        size2 = tank2.size.value.upper() if tank2.size else 'REGULAR'
        
        # Size comparison log
        print(f"Tank sizes comparison: {{'tank1': {{'id': {tank1.id}, 'position': '{tank1.position}', 'size': '{size1}'}}, 'tank2': {{'id': {tank2.id}, 'position': '{tank2.position}', 'size': '{size2}'}}}}")
        
        # Verify tanks are same size
        if size1 != size2:
            return jsonify({'message': 'Cannot swap tanks of different sizes'}), 400
        
        # SIMPLIFIED VERSION: Only swap essential properties
        # Store tank1 values
        temp_position = tank1.position
        temp_rack_id = tank1.rack_id
        
        # Update tank positions
        tank1.position = tank2.position
        tank1.rack_id = tank2.rack_id
        
        tank2.position = temp_position
        tank2.rack_id = temp_rack_id
        
        # Track position history
        now = datetime.utcnow()
        
        # Record tank1's new position
        history1 = TankPositionHistoryModel(
            tank_id=tank1.id,
            position=tank1.position,
            rack_id=tank1.rack_id,
            start_date=now
        )
        
        # Record tank2's new position
        history2 = TankPositionHistoryModel(
            tank_id=tank2.id,
            position=tank2.position,
            rack_id=tank2.rack_id,
            start_date=now
        )
        
        db.session.add(history1)
        db.session.add(history2)
        
        db.session.commit()
        return jsonify({'message': 'Tank positions swapped successfully'})
        
    except Exception as e:
        db.session.rollback()
        print(f"Error swapping tanks: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'message': str(e)}), 500

# Profile endpoints
@app.route('/api/breeding/profiles', methods=['GET'])
@jwt_required()
def get_profiles():
    current_user_id = get_current_user_id()
    facility_id = get_current_facility_id()
    
    # Build query with filters
    query = BreedingProfileModel.query
    
    # Always filter by user_id if not an admin
    user = UserModel.query.get(current_user_id)
    if user and user.role != UserRole.ADMIN:
        query = query.filter_by(user_id=current_user_id)
    
    # Filter by facility_id (essential for multi-tenant isolation)
    if facility_id is not None:
        query = query.filter_by(facility_id=facility_id)
    
    profiles = query.all()
    
    print(f"GET /api/breeding/profiles - Found {len(profiles)} profiles for facility {facility_id}")
    
    return jsonify([{
        'id': p.id,
        'name': p.name,
        'created_at': p.created_at.isoformat()
    } for p in profiles])

@app.route('/api/breeding/profiles', methods=['POST'])
@jwt_required()
def create_profile():
    try:
        data = request.json
        current_user_id = get_current_user_id()
        facility_id = get_current_facility_id()
        
        # Add logging for debugging
        print(f"Creating profile for user {current_user_id} with name {data.get('name')} in facility {facility_id}")
        
        profile = BreedingProfileModel(
            name=data['name'],
            user_id=int(current_user_id),
            facility_id=facility_id  # Add this line to set facility_id
        )
        db.session.add(profile)
        db.session.commit()
        
        print(f"Profile created with ID: {profile.id}")
        
        return jsonify({
            'id': profile.id,
            'name': profile.name,
            'created_at': profile.created_at.isoformat()
        }), 201
    except Exception as e:
        print(f"Error creating profile: {str(e)}")
        db.session.rollback()
        return jsonify({'message': str(e)}), 500

@app.route('/api/breeding/profiles/<int:profile_id>', methods=['DELETE'])
@jwt_required()
def delete_profile(profile_id):
    try:
        profile = BreedingProfileModel.query.get_or_404(profile_id)
        db.session.delete(profile)
        db.session.commit()
        return jsonify({'message': 'Profile deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 400

@app.route('/api/breeding/profiles/<int:profile_id>', methods=['PUT'])
@jwt_required()
def update_profile(profile_id):
    try:
        data = request.json
        profile = BreedingProfileModel.query.get_or_404(profile_id)
        
        if 'name' in data:
            profile.name = data['name']
            
        db.session.commit()
        return jsonify({
            'id': profile.id,
            'name': profile.name,
            'created_at': profile.created_at.isoformat()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 400

# Breeding plan endpoints
@app.route('/api/breeding/plans', methods=['GET'])
@jwt_required()
def get_plans():
    profile_id = request.args.get('profile_id')
    facility_id = get_current_facility_id()
    
    # Get the profile
    profile = BreedingProfileModel.query.get_or_404(profile_id)
    
    # Check if profile belongs to current facility
    if facility_id and profile.facility_id != facility_id:
        return jsonify({"message": "Access denied to this breeding profile"}), 403
    
    # Get plans for the profile
    plans = BreedingPlanModel.query.filter_by(profile_id=profile_id).all()
    
    return jsonify([{
        'id': plan.id,
        'breeding_date': plan.breeding_date.isoformat(),
        'created_at': plan.created_at.isoformat(),
        'crosses': [{
            'id': cross.id,
            'tank1_id': cross.tank1_id,
            'tank2_id': cross.tank2_id,
            'tank1_males': cross.tank1_males,
            'tank1_females': cross.tank1_females,
            'tank2_males': cross.tank2_males,
            'tank2_females': cross.tank2_females,
            'breeding_result': cross.breeding_result
        } for cross in plan.crosses]
    } for plan in plans])

@app.route('/api/breeding/plans', methods=['POST'])
@jwt_required()
def create_plan():
    data = request.json
    
    # Validate fish counts
    for cross in data['crosses']:
        tank1 = TankModel.query.get_or_404(cross['tank1']['id'])
        tank2 = TankModel.query.get_or_404(cross['tank2']['id'])
        
        # Get available fish counts
        tank1_fish = {
            'males': sum(s.count for s in tank1.subdivisions if s.gender == GenderEnum.MALE),
            'females': sum(s.count for s in tank1.subdivisions if s.gender == GenderEnum.FEMALE)
        }
        tank2_fish = {
            'males': sum(s.count for s in tank2.subdivisions if s.gender == GenderEnum.MALE),
            'females': sum(s.count for s in tank2.subdivisions if s.gender == GenderEnum.FEMALE)
        }
        
        # Validate counts
        if (cross['tank1']['males'] > tank1_fish['males'] or
            cross['tank1']['females'] > tank1_fish['females'] or
            cross['tank2']['males'] > tank2_fish['males'] or
            cross['tank2']['females'] > tank2_fish['females']):
            return jsonify({'message': 'Insufficient fish in tanks'}), 400
    
    # Create plan and crosses
    plan = BreedingPlanModel(
        profile_id=data['profile_id'],
        breeding_date=datetime.strptime(data['breeding_date'], '%Y-%m-%d').date()
    )
    db.session.add(plan)
    db.session.flush()  # Add this line to get plan.id before creating crosses
    
    for cross_data in data['crosses']:
        cross = CrossModel(
            plan_id=plan.id,  # Now plan.id will have a value
            tank1_id=cross_data['tank1']['id'],
            tank2_id=cross_data['tank2']['id'],
            tank1_males=cross_data['tank1']['males'],
            tank1_females=cross_data['tank1']['females'],
            tank2_males=cross_data['tank2']['males'],
            tank2_females=cross_data['tank2']['females'],
            breeding_result=cross_data.get('breedingResult')  # Add this line
        )
        db.session.add(cross)
    
    db.session.commit()
    return jsonify({'id': plan.id}), 201

@app.route('/api/breeding/plans/<int:plan_id>', methods=['DELETE'])
@jwt_required()
def delete_plan(plan_id):
    try:
        plan = BreedingPlanModel.query.get_or_404(plan_id)
        
        # Delete all crosses associated with this plan
        CrossModel.query.filter_by(plan_id=plan_id).delete()
        
        # Delete the plan
        db.session.delete(plan)
        db.session.commit()
        
        return jsonify({'message': 'Breeding plan deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 400

@app.route('/api/breeding/plans/<int:plan_id>', methods=['PUT'])
@jwt_required()
def update_plan(plan_id):
    data = request.json
    
    try:
        plan = BreedingPlanModel.query.get_or_404(plan_id)
        
        # Update breeding date if provided
        if 'breeding_date' in data:
            plan.breeding_date = datetime.strptime(data['breeding_date'], '%Y-%m-%d').date()
        
        if 'crosses' in data:
            # Delete existing crosses
            CrossModel.query.filter_by(plan_id=plan_id).delete()
            
            # Create new crosses
            for cross_data in data['crosses']:
                cross = CrossModel(
                    plan_id=plan.id,
                    tank1_id=cross_data['tank1']['id'],
                    tank2_id=cross_data['tank2']['id'],
                    tank1_males=cross_data['tank1']['males'],
                    tank1_females=cross_data['tank1']['females'],
                    tank2_males=cross_data['tank2']['males'],
                    tank2_females=cross_data['tank2']['females'],
                    breeding_result=cross_data.get('breedingResult')  # Add this line
                )
                db.session.add(cross)
                
        db.session.commit()
        return jsonify({'message': 'Plan updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 400

@app.route('/api/breeding/crosses/<int:cross_id>', methods=['PATCH'])  # Changed methods['PATCH'] to methods=['PATCH']
@jwt_required()
def update_cross(cross_id):
    data = request.json
    
    try:
        cross = CrossModel.query.get_or_404(cross_id)
        
        if 'breedingResult' in data:
            cross.breeding_result = data['breedingResult']
        
        db.session.commit()
        return jsonify({'message': 'Cross updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 400

@app.route('/api/breeding/plans/<int:plan_id>', methods=['GET'])
@jwt_required()
def get_plan(plan_id):
    try:
        plan = BreedingPlanModel.query.get_or_404(plan_id)
        crosses = CrossModel.query.filter_by(plan_id=plan_id).all()
        
        return jsonify({
            'id': plan.id,
            'profile_id': plan.profile_id,
            'breeding_date': plan.breeding_date.isoformat(),
            'created_at': plan.created_at.isoformat(),
            'crosses': [{
                'id': cross.id,
                'tank1_id': cross.tank1_id,
                'tank2_id': cross.tank2_id,
                'tank1_males': cross.tank1_males,
                'tank1_females': cross.tank1_females,
                'tank2_males': cross.tank2_males,
                'tank2_females': cross.tank2_females,
                'breeding_result': cross.breeding_result
            } for cross in crosses]
        }), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 400

@app.route('/api/breeding/plans/search', methods=['POST'])
@jwt_required()
def search_breeding_plans():
    data = request.json
    query = BreedingPlanModel.query
    
    # Filter by profile ID
    if 'profile_id' in data:
        query = query.filter(BreedingPlanModel.profile_id == data['profile_id'])
    
    # Filter by date range
    if 'dateFrom' in data and data['dateFrom']:
        start_date = datetime.strptime(data['dateFrom'], '%Y-%m-%d').date()
        query = query.filter(BreedingPlanModel.breeding_date >= start_date)
    
    if 'dateTo' in data and data['dateTo']:
        end_date = datetime.strptime(data['dateTo'], '%Y-%m-%d').date()
        query = query.filter(BreedingPlanModel.breeding_date <= end_date)
    
    # Get all plans that match the initial filters
    plans = query.all()
    
    # Further filter by tank properties or breeding result
    filtered_plans = []
    for plan in plans:
        # Skip filtering if no additional filters
        if not (data.get('tankLine') or data.get('tankPosition') or 'breedingResult' in data):
            filtered_plans.append(plan)
            continue
            
        # Check each cross in the plan
        for cross in plan.crosses:
            tank1 = TankModel.query.get(cross.tank1_id)
            tank2 = TankModel.query.get(cross.tank2_id)
            
            # Check if the tanks match the line filter
            if data.get('tankLine'):
                if not ((tank1 and tank1.line == data['tankLine']) or 
                        (tank2 and tank2.line == data['tankLine'])):
                    continue
            
            # Check if the tanks match the position filter
            if data.get('tankPosition'):
                if not ((tank1 and tank1.position == data['tankPosition']) or 
                        (tank2 and tank2.position == data['tankPosition'])):
                    continue
            
            # Check if breeding result matches
            if 'breedingResult' in data and data['breedingResult']:
                if data['breedingResult'] == 'null':
                    if cross.breeding_result is not None:
                        continue
                else:
                    breeding_result = data['breedingResult'] == 'true'
                    if cross.breeding_result != breeding_result:
                        continue
            
            # If we get here, this plan has a cross that matches all filters
            filtered_plans.append(plan)
            break  # No need to check other crosses in this plan
            
    # Format the plans for response
    return jsonify([{
        'id': plan.id,
        'breeding_date': plan.breeding_date.isoformat(),
        'created_at': plan.created_at.isoformat(),
        'crosses': [{
            'id': cross.id,
            'tank1_id': cross.tank1_id,
            'tank2_id': cross.tank2_id,
            'tank1_males': cross.tank1_males,
            'tank1_females': cross.tank1_females,
            'tank2_males': cross.tank2_males,
            'tank2_females': cross.tank2_females,
            'breeding_result': cross.breeding_result
        } for cross in plan.crosses]
    } for plan in filtered_plans])

@app.route('/api/breeding/tank-history/<int:tank_id>', methods=['GET'])
@jwt_required()
def get_tank_breeding_history(tank_id):
    try:
        tank = TankModel.query.get_or_404(tank_id)
        
        # Get position history - ensure it's ordered by start_date
        position_history = TankPositionHistoryModel.query.filter_by(tank_id=tank_id)\
            .order_by(TankPositionHistoryModel.start_date).all()
        
        if not position_history:
            # Create an initial position history entry if none exists
            current_position = TankPositionHistoryModel(
                tank_id=tank_id,
                position=tank.position,
                rack_id=tank.rack_id,
                start_date=tank.created_at or datetime.utcnow()
            )
            db.session.add(current_position)
            db.session.commit()
            
            # Fetch the newly created position history
            position_history = [current_position]
        
        # Find all crosses that involve this tank
        crosses_as_tank1 = CrossModel.query.filter_by(tank1_id=tank_id).all()
        crosses_as_tank2 = CrossModel.query.filter_by(tank2_id=tank_id).all()
        
        # Initialize breeding history
        breeding_history = []
        
        # Process crosses where this tank was tank1
        for cross in crosses_as_tank1:
            plan = BreedingPlanModel.query.get(cross.plan_id)
            if not plan:
                continue
                
            position = tank.position  # Default position
            
            # Find the appropriate historical position for this breeding date
            for ph in position_history:
                start_date = ph.start_date.date()
                end_date = ph.end_date.date() if ph.end_date else datetime.now().date()
                
                if start_date <= plan.breeding_date <= end_date:
                    position = ph.position
                    break
            
            breeding_history.append({
                'date': plan.breeding_date.isoformat(),
                'males_used': cross.tank1_males,
                'females_used': cross.tank1_females,
                'breeding_result': cross.breeding_result,
                'position': position
            })
        
        # Process crosses where this tank was tank2
        for cross in crosses_as_tank2:
            plan = BreedingPlanModel.query.get(cross.plan_id)
            if not plan:
                continue
                
            position = tank.position  # Default position
            
            # Find the appropriate historical position for this breeding date
            for ph in position_history:
                start_date = ph.start_date.date()
                end_date = ph.end_date.date() if ph.end_date else datetime.now().date()
                
                if start_date <= plan.breeding_date <= end_date:
                    position = ph.position
                    break
            
            breeding_history.append({
                'date': plan.breeding_date.isoformat(),
                'males_used': cross.tank2_males,
                'females_used': cross.tank2_females,
                'breeding_result': cross.breeding_result,
                'position': position
            })
        
        # Format position history for response
        formatted_position_history = [{
            'position': ph.position,
            'rack_name': ph.rack.name if ph.rack else "Unknown Rack",
            'startDate': ph.start_date.isoformat(),
            'endDate': ph.end_date.isoformat() if ph.end_date else None
        } for ph in position_history]
        
        return jsonify({
            'tank': {
                'id': tank.id,
                'position': tank.position,
                'line': tank.line
            },
            'positionHistory': formatted_position_history,
            'breeding_history': breeding_history
        }), 200
        
    except Exception as e:
        print(f"Error in get_tank_breeding_history: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'message': str(e)}), 400

@app.route('/api/breeding/debug/tank-history/<int:tank_id>', methods=['GET'])
@jwt_required()
def debug_tank_breeding_history(tank_id):
    try:
        # Get all crosses involving this tank
        crosses_as_tank1 = CrossModel.query.filter_by(tank1_id=tank_id).all()
        crosses_as_tank2 = CrossModel.query.filter_by(tank2_id=tank_id).all()
        
        tank1_data = []
        tank2_data = []
        
        # Get details for crosses where this was tank1
        for cross in crosses_as_tank1:
            plan = BreedingPlanModel.query.get(cross.plan_id)
            if plan:
                tank1_data.append({
                    'cross_id': cross.id,
                    'plan_id': cross.plan_id,
                    'breeding_date': plan.breeding_date.isoformat(),
                    'result': cross.breeding_result,
                    'males_used': cross.tank1_males,
                    'females_used': cross.tank1_females
                })
        
        # Get details for crosses where this was tank2
        for cross in crosses_as_tank2:
            plan = BreedingPlanModel.query.get(cross.plan_id)
            if plan:
                tank2_data.append({
                    'cross_id': cross.id,
                    'plan_id': cross.plan_id,
                    'breeding_date': plan.breeding_date.isoformat(),
                    'result': cross.breeding_result,
                    'males_used': cross.tank2_males,
                    'females_used': cross.tank2_females
                })
        
        return jsonify({
            'tank_id': tank_id,
            'as_tank1': tank1_data,
            'as_tank2': tank2_data,
            'total_crosses': len(tank1_data) + len(tank2_data)
        }), 200
    
    except Exception as e:
        print(f"Error in debug_tank_breeding_history: {str(e)}")
        return jsonify({'message': str(e)}), 400

def get_tank_position_at_date(tank_id, date):
    """Helper function to get the tank position at a specific date"""
    position_record = TankPositionHistoryModel.query.filter_by(tank_id=tank_id)\
        .filter(TankPositionHistoryModel.start_date <= date)\
        .filter(or_(TankPositionHistoryModel.end_date >= date, TankPositionHistoryModel.end_date == None))\
        .first()
    
    if position_record:
        return position_record.position
    return None

@app.route('/api/breeding/calendar/<date>', methods=['GET'])
@jwt_required()
def get_calendar_data(date):
    try:
        start_date = datetime.strptime(date, '%Y-%m-%d')
        facility_id = get_current_facility_id()  # Get current facility
        
        # Use the provided end_date or default to 7 days later
        end_date_str = request.args.get('end_date')
        if end_date_str:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
        else:
            end_date = start_date + timedelta(days=6)
        
        # Filter by facility_id if available
        query = BreedingCalendarModel.query.filter(
            BreedingCalendarModel.date >= start_date,
            BreedingCalendarModel.date <= end_date
        )
        
        if facility_id is not None:
            query = query.filter_by(facility_id=facility_id)
            
        calendar_entries = query.order_by(BreedingCalendarModel.date).all()
        
        # Manually convert to dictionaries
        result = []
        for entry in calendar_entries:
            result.append({
                'id': entry.id,
                'date': entry.date.isoformat() if entry.date else None,
                'username': entry.username,
                'request_type': entry.request_type,
                'fish_age': entry.fish_age,
                'notes': entry.notes,
                'created_at': entry.created_at.isoformat() if entry.created_at else None
            })
        
        return jsonify(result)
    except Exception as e:
        print(f"Error fetching calendar data: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'message': f'Server error: {str(e)}'}), 500

@app.route('/api/breeding/calendar/request', methods=['POST'])
@jwt_required()
def add_breeding_request():
    try:
        data = request.json
        facility_id = get_current_facility_id()  # Get current facility
        
        date = data.get('date')
        username = data.get('username')
        request_type = data.get('request_type')
        fish_age = data.get('fish_age')
        notes = data.get('notes')
        
        if not date or not username or not request_type:
            return jsonify({'message': 'Missing required fields'}), 400
        
        # Use the model instead of raw SQL
        new_request = BreedingCalendarModel(
            date=datetime.strptime(date, '%Y-%m-%d'),
            username=username,
            request_type=request_type,
            fish_age=fish_age,
            notes=notes,
            facility_id=facility_id  # Add facility_id
        )
        
        db.session.add(new_request)
        db.session.commit()
        
        return jsonify({
            'id': new_request.id,
            'date': date,
            'username': username,
            'request_type': request_type,
            'fish_age': fish_age,
            'notes': notes
        }), 201
        
    except Exception as e:
        print(f"Error adding breeding request: {str(e)}")
        db.session.rollback()
        return jsonify({'message': f'Server error: {str(e)}'}), 500



@app.route('/api/breeding/calendar/history', methods=['GET'])
@jwt_required()
def get_calendar_history():
    try:
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        
        if not start_date_str or not end_date_str:
            return jsonify({'message': 'Start and end dates are required'}), 400
            
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
        
        # Use the ORM model instead of raw SQL
        calendar_entries = BreedingCalendarModel.query.filter(
            BreedingCalendarModel.date >= start_date,
            BreedingCalendarModel.date <= end_date
        ).order_by(BreedingCalendarModel.date).all()
        
        # Manually convert to dictionaries
        result = []
        for entry in calendar_entries:
            result.append({
                'id': entry.id,
                'date': entry.date.isoformat() if entry.date else None,
                'username': entry.username,
                'request_type': entry.request_type,
                'fish_age': entry.fish_age,
                'notes': entry.notes,
                'created_at': entry.created_at.isoformat() if entry.created_at else None
            })
        
        return jsonify(result)
    except Exception as e:
        print(f"Error fetching calendar history: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'message': f'Server error: {str(e)}'}), 500

@app.route('/api/breeding/calendar/request/<int:request_id>', methods=['DELETE'])
@jwt_required()
def delete_breeding_request(request_id):
    try:
        facility_id = get_current_facility_id()
        
        # Find the request and check if it belongs to this facility
        request_to_delete = BreedingCalendarModel.query.get(request_id)
        
        if not request_to_delete:
            return jsonify({'message': 'Request not found'}), 404
            
        # Extra security: Only allow deleting requests from your own facility
        if facility_id is not None and request_to_delete.facility_id != facility_id:
            return jsonify({'message': 'You can only delete requests from your own facility'}), 403
            
        db.session.delete(request_to_delete)
        db.session.commit()
        
        return jsonify({'message': 'Request deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error deleting request: {str(e)}'}), 500

# Clinical Management Routes
@app.route('/api/clinical/cases', methods=['GET'])
@jwt_required()
def get_cases():
    current_user_id = get_current_user_id()
    facility_id = get_current_facility_id()
    
    # Filter cases by facility_id
    query = ClinicalCaseModel.query
    
    if facility_id:
        query = query.filter_by(facility_id=facility_id)
    
    cases = query.order_by(ClinicalCaseModel.report_date.desc()).all()
    
    case_data = []
    for case in cases:
        # Get tank details
        tank = TankModel.query.get(case.tank_id)
        rack = RackModel.query.get(tank.rack_id) if tank else None
        
        # Get reporter details (if available)
        reporter = None
        if case.user_id:
            reporter = UserModel.query.get(case.user_id)
            
        case_data.append({
            'id': case.id,
            'tank_id': case.tank_id,
            'tank_position': tank.position if tank else "Unknown",
            'rack_name': rack.name if rack else "Unknown",
            'reporter': reporter.username if reporter else "Unknown",
            'symptoms': case.symptoms,
            'fish_count': case.fish_count,
            'report_date': case.report_date.isoformat() if case.report_date else None,
            'note': case.note,
            'status': case.status,
            'closure_reason': case.closure_reason
        })
        
    return jsonify(case_data)



@app.route('/api/clinical/cases', methods=['POST'])
@jwt_required()
def create_clinical_case():
    try:
        data = request.json
        current_user_id = get_current_user_id()
        facility_id = get_current_facility_id()
        
        # Validate required fields
        required_fields = ['tank_id', 'symptoms', 'fish_count', 'report_date']
        for field in required_fields:
            if field not in data:
                return jsonify({'message': f'Missing required field: {field}'}), 400
        
        # Create new case
        new_case = ClinicalCaseModel(
            tank_id=data['tank_id'],
            symptoms=data['symptoms'],
            fish_count=data['fish_count'],
            report_date=datetime.strptime(data['report_date'], '%Y-%m-%d').date(),
            note=data.get('note', ''),
            user_id=current_user_id,
            status='Open',
            facility_id=facility_id
        )
        
        db.session.add(new_case)
        db.session.flush()  # Get the case ID before commit
        
        # Get information needed for the notification
        user = UserModel.query.get(current_user_id)
        tank = TankModel.query.get(data['tank_id'])
        
        # Create notification message
        message = f"{user.username} opened a new clinical case for tank {tank.position if tank else 'Unknown'}"
        
        # Create notifications for facility members
        create_notification(
            facility_id=facility_id,
            sender_id=current_user_id,
            message=message,
            category='case_opened',
            reference_id=new_case.id
        )
        
        db.session.commit()
        
        # Return the new case
        return jsonify({
            'id': new_case.id,
            'tank_id': new_case.tank_id,
            'symptoms': new_case.symptoms,
            'fish_count': new_case.fish_count,
            'report_date': new_case.report_date.isoformat(),
            'note': new_case.note,
            'status': new_case.status
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error creating clinical case: {str(e)}")
        return jsonify({'message': f'Server error: {str(e)}'}), 500

@app.route('/api/clinical/cases/<int:case_id>/notes', methods=['POST'])
@jwt_required()
def add_case_note(case_id):
    try:
        data = request.json
        current_user_id = get_current_user_id()
        
        if 'content' not in data or not data['content'].strip():
            return jsonify({'message': 'Note content is required'}), 400
        
        # Verify the case exists
        case = ClinicalCaseModel.query.get_or_404(case_id)
        
        # Create new note
        new_note = ClinicalNoteModel(
            case_id=case_id,
            content=data['content'],
            user_id=current_user_id
        )
        
        db.session.add(new_note)
        
        # Update the case's updated_at timestamp
        case.updated_at = datetime.utcnow()
        
        # Get information needed for the notification
        user = UserModel.query.get(current_user_id)
        tank = TankModel.query.get(case.tank_id)
        
        # Create notification message
        message = f"{user.username} added a note to case #{case_id} for tank {tank.position if tank else 'Unknown'}"
        
        # Create notifications for facility members
        create_notification(
            facility_id=case.facility_id,
            sender_id=current_user_id,
            message=message,
            category='note_added',
            reference_id=case_id
        )
        
        db.session.commit()
        
        # Get username of note author
        username = user.username if user else 'Unknown'
        
        return jsonify({
            'id': new_note.id,
            'case_id': new_note.case_id,
            'content': new_note.content,
            'username': username,
            'timestamp': new_note.created_at.isoformat(),
            'created_at': new_note.created_at.isoformat()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error adding case note: {str(e)}")
        return jsonify({'message': f'Server error: {str(e)}'}), 500

@app.route('/api/clinical/cases/<int:case_id>/status', methods=['PATCH'])
@jwt_required()
def update_case_status(case_id):
    try:
        data = request.json
        
        if 'status' not in data:
            return jsonify({'message': 'Status is required'}), 400
        
        # Verify the case exists
        case = ClinicalCaseModel.query.get_or_404(case_id)
        
        # Update status
        case.status = data['status']
        
        # If status is closed, update closure reason
        if case.status == 'Closed':
            if 'closure_reason' not in data or not data['closure_reason']:
                return jsonify({'message': 'Closure reason is required when closing a case'}), 400
            case.closure_reason = data['closure_reason']
        
        db.session.commit()
        
        return jsonify({
            'id': case.id,
            'status': case.status,
            'closure_reason': case.closure_reason
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating case status: {str(e)}")
        return jsonify({'message': f'Server error: {str(e)}'}), 500

@app.route('/api/clinical/cases/<int:case_id>', methods=['DELETE'])
@jwt_required()
def delete_clinical_case(case_id):
    try:
        # Find the case by ID
        case = ClinicalCaseModel.query.get_or_404(case_id)
        
        # Delete the case (notes will be deleted automatically due to cascade)
        db.session.delete(case)
        db.session.commit()
        
        return jsonify({'message': 'Case deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting clinical case: {str(e)}")
        return jsonify({'message': f'Server error: {str(e)}'}), 500

@app.route('/api/clinical/cases/<int:case_id>', methods=['GET'])
@jwt_required()
def get_clinical_case(case_id):
    try:
        # Get current user's facility
        facility_id = get_current_facility_id()
        
        # Get the case with its notes
        case = ClinicalCaseModel.query.filter_by(id=case_id).first()
        
        if not case:
            return jsonify({'message': 'Case not found'}), 404
            
        # Check if case belongs to current facility
        if case.facility_id != facility_id:
            return jsonify({'message': 'Unauthorized access to case'}), 403
        
        # Get tank and rack information
        from models_db import TankModel, RackModel
        tank = TankModel.query.get(case.tank_id)
        rack = RackModel.query.get(tank.rack_id) if tank else None
        
        # Get all notes with user information
        from models_db import ClinicalNoteModel, UserModel
        notes_with_users = db.session.query(
            ClinicalNoteModel, 
            UserModel.username
        ).outerjoin(
            UserModel, 
            ClinicalNoteModel.user_id == UserModel.id
        ).filter(
            ClinicalNoteModel.case_id == case_id
        ).order_by(
            ClinicalNoteModel.created_at
        ).all()
        
        # Format notes
        formatted_notes = []
        for note, username in notes_with_users:
            formatted_notes.append({
                'id': note.id,
                'content': note.content,
                'username': username or 'Unknown User',
                'timestamp': note.created_at.isoformat() if note.created_at else None
            })
        
        # Use the correct field name for tank line (line instead of line_name)
        return jsonify({
            'id': case.id,
            'tank_id': case.tank_id,
            'tank_position': tank.position if tank else None,
            'tank_line': tank.line if tank else None,  # Changed from line_name to line
            'rack_name': rack.name if rack else 'Unknown',
            'symptoms': case.symptoms,
            'fish_count': case.fish_count,
            'report_date': case.report_date.isoformat() if case.report_date else None,
            'note': case.note,
            'status': case.status,
            'closure_reason': case.closure_reason,
            'created_at': case.created_at.isoformat() if case.created_at else None,
            'notes': formatted_notes
        }), 200
        
    except Exception as e:
        print(f"Error getting clinical case: {str(e)}")
        return jsonify({'message': f'Server error: {str(e)}'}), 500

@app.route('/api/user', methods=['GET'])
@jwt_required()
def get_user():
    current_user_id = get_current_user_id()
    user = UserModel.query.get(current_user_id)
    
    if not user:
        return jsonify({"message": "User not found"}), 404
        
    print(f"User info requested. User ID: {user.id}, Role: {user.role}")
    
    # Normalize role to string to ensure consistent format
    if hasattr(user.role, 'value'):
        role_str = user.role.value
    elif hasattr(user.role, 'name'):
        role_str = user.role.name 
    else:
        role_str = str(user.role)
    
    print(f"Normalized user role to: {role_str}")
    
    # Add facility info to response
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
        "role": role_str,
        "facility": facility_info
    }), 200

# Create a debugging route to understand the JWT structure
@app.route('/api/debug-token', methods=['GET'])
@jwt_required()
def debug_token():
    try:
        # Get raw token from header
        auth_header = request.headers.get('Authorization', '')
        if (auth_header.startswith('Bearer ')):
            raw_token = auth_header[7:]
            
            # Get decoded identity
            identity = get_jwt_identity()
            
            # Get full decoded token
            decoded = get_jwt()
            
            print("Raw token:", raw_token[:20] + "...")
            print("Decoded identity:", identity)
            print("Full decoded payload:", decoded)
            
            # Add debug info about the current user's ID and facility
            user_id = get_current_user_id()
            facility_id = get_current_facility_id()
            
            print(f"Current user ID: {user_id}")
            print(f"Current facility ID: {facility_id}")
            
            return jsonify({
                "identity": identity,
                "decoded": decoded,
                "user_id": user_id,
                "facility_id": facility_id
            }), 200
        else:
            return jsonify({"error": "Missing or malformed Authorization header"}), 400
    except Exception as e:
        print(f"Debug token error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/debug-jwt', methods=['GET'])
@jwt_required()
def debug_jwt():
    try:
        # Print auth header
        auth_header = request.headers.get('Authorization', '')
        print(f"Auth header: {auth_header[:20]}...")

        # Get identity and decode into readable form
        identity = get_jwt_identity()
        print(f"JWT identity: {identity}, type: {type(identity)}")
        
        # Get current user ID from identity
        user_id = get_current_user_id()
        print(f"User ID: {user_id}")
        
        # Get user from database
        user = UserModel.query.get(user_id) if user_id else None
        
        # Get facility info
        facility_id = get_current_facility_id()
        print(f"Facility ID: {facility_id}")
        
        facility = FacilityModel.query.get(facility_id) if facility_id else None
        
        return jsonify({
            'identity': identity,
            'user_id': user_id,
            'username': user.username if user else None,
            'facility_id': facility_id,
            'facility_name': facility.name if facility else None,
        }), 200
    except Exception as e:
        print(f"Debug JWT error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# Add these notification routes in app.py
@app.route('/api/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    try:
        current_user_id = get_current_user_id()
        limit = request.args.get('limit', 10, type=int)
        
        # Query notifications for this user
        from models_db import NotificationModel
        notifications = NotificationModel.query.filter_by(
            user_id=current_user_id
        ).order_by(
            NotificationModel.created_at.desc()
        ).limit(limit).all()
        
        return jsonify([{
            'id': n.id,
            'message': n.message,
            'is_read': n.is_read,
            'created_at': n.created_at.isoformat()
        } for n in notifications])
    except Exception as e:
        print(f"Error fetching notifications: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/subscription/status', methods=['GET'])
@jwt_required()
def check_subscription_status():
    try:
        facility_id = get_current_facility_id()
        
        # Query subscription for this facility
        subscription = SubscriptionModel.query.filter_by(
            facility_id=facility_id
        ).first()
        
        if subscription:
            return jsonify({
                'active': subscription.is_active,
                'expiresAt': subscription.end_date.isoformat() if subscription.end_date else None,
                'plan': subscription.plan_type
            })
        else:
            return jsonify({
                'active': False,
                'message': 'No subscription found'
            })
    except Exception as e:
        print(f"Error checking subscription: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/notifications/<int:notification_id>/read', methods=['POST'])
@jwt_required()
def mark_notification_read(notification_id):
    current_user_id = get_current_user_id()
    
    from notification_service import mark_notification_as_read
    success = mark_notification_as_read(notification_id, current_user_id)
    
    if success:
        return jsonify({'message': 'Notification marked as read'}), 200
    else:
        return jsonify({'message': 'Notification not found'}), 404

@app.route('/api/notifications/read-all', methods=['POST'])
@jwt_required()
def mark_all_notifications_read():
    current_user_id = get_current_user_id()
    
    from notification_service import mark_all_as_read
    mark_all_as_read(current_user_id)
    
    return jsonify({'message': 'All notifications marked as read'}), 200

# Create a health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat()
    })

# Add security headers to all responses
@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    return response

# Update the after_request function
@app.after_request
def after_request(response):
    # Set CORS headers specifically for your frontend origin
    origin = request.headers.get('Origin')
    allowed_origins = [
        "https://zefitrack.netlify.app",
        "http://localhost:3000",
        "https://zebrafishregistry.web.app",
        "https://zebrafishregistry.firebaseapp.com"
    ]
    
    if origin in allowed_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
    
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET,PUT,POST,DELETE,OPTIONS,PATCH"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

# Test endpoint for CORS - No JWT required
@app.route('/api/cors-test', methods=['GET', 'OPTIONS'])
def cors_test():
    # Simple endpoint that doesn't require authentication
    return jsonify({
        "message": "CORS is working correctly",
        "timestamp": datetime.utcnow().isoformat()
    })

# Serve via HTTPS (for example in production behind a reverse proxy)
# Also add a simple IP-based rate limiter:
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

limiter.init_app(app)

# Add a test endpoint that's easy to check in browser
@app.route('/', methods=['GET'])
def root():
    return "Zebrafish Registry API is running. Access endpoints through /api/..."

# Add these at the end of app.py but before the if __name__ == "__main__":

@app.route('/api/test', methods=['GET'])
def api_test():
    return jsonify({"message": "API test successful"}), 200

@app.route('/test', methods=['GET'])
def root_test():
    return jsonify({"message": "Root test successful"}), 200

breeding_bp = Blueprint('breeding_bp', __name__)

@breeding_bp.route('/calendar/request', methods=['POST'])
@jwt_required()
def create_breeding_request():
    # Your “/api/breeding/calendar/request” logic here
    pass

@breeding_bp.route('/calendar/request/<int:request_id>', methods=['DELETE'])
@jwt_required()
def delete_breeding_request(request_id):
    # Your “/api/breeding/calendar/request/<request_id>” logic here
    pass

@breeding_bp.route('/calendar/history', methods=['GET'])
@jwt_required()
def breeding_history():
    # Your “/api/breeding/calendar/history” logic here
    pass

# Register the blueprint
app.register_blueprint(breeding_bp, url_prefix='/api/breeding')

@app.route('/api/check-super-admin', methods=['GET'])
@jwt_required()
def check_super_admin():
    try:
        user_id = get_current_user_id()
        user = UserModel.query.get(user_id)
        if not user:
            return jsonify({"is_super_admin": False}), 200
            
        # Check if user has super admin flag or other criteria
        is_super_admin = user.is_super_admin if hasattr(user, 'is_super_admin') else False
        return jsonify({"is_super_admin": is_super_admin}), 200
    except Exception as e:
        print(f"Error in check_super_admin: {str(e)}")
        return jsonify({"error": str(e), "is_super_admin": False}), 500

# Add this after your imports
@app.route('/api/init-db', methods=['POST'])
def init_database():
    """Initialize database tables"""
    try:
        # Create all tables
        db.create_all()
        
        # Create a default facility if none exists
        if not FacilityModel.query.first():
            default_facility = FacilityModel(
                name="Default Facility",
                organization_name="Zebrafish Research Lab"
            )
            db.session.add(default_facility)
            db.session.commit()
            
        return jsonify({
            "message": "Database initialized successfully", 
            "status": "success"
        }), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error initializing database: {str(e)}")
        return jsonify({
            "message": f"Database initialization failed: {str(e)}", 
            "status": "error"
        }), 500

@app.route('/api/init-test-data', methods=['POST'])
@jwt_required()
def init_test_data():
    """Initialize test data for a facility"""
    try:
        facility_id = get_current_facility_id()
        
        # Add a test rack if none exists
        if not RackModel.query.filter_by(facility_id=facility_id).first():
            new_rack = RackModel(
                name="Test Rack 1",
                lab_id="TR-001",
                rows=6,
                columns=6,
                facility_id=facility_id,
                row_configs={"0": 6, "1": 6}
            )
            db.session.add(new_rack)
            db.session.commit()
            
            # Add test tanks
            new_tank = TankModel(
                position="A1",
                size=GenderEnum.REGULAR,
                line="Wildtype",
                color="#BBDEFB",
                rack_id=new_rack.id
            )
            db.session.add(new_tank)
            db.session.commit()
            
            return jsonify({"message": "Test data created successfully"}), 201
        else:
            return jsonify({"message": "Test data already exists"}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error creating test data: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))

