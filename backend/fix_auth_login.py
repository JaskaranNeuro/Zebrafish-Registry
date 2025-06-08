from config import app, db
from auth import auth_bp, create_access_token, jwt_required, get_jwt_identity, check_password_hash, jsonify
from models_db import UserModel, FacilityModel
from flask import request

def update_login_function():
    # This function doesn't actually modify the file, it just demonstrates the correct code
    print("Below is the correct login function code. Update your auth.py with this:")
    print("""
@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        # Find the user by username
        user = UserModel.query.filter_by(username=data['username']).first()
        
        # Check if user exists and password is correct
        if not user or not check_password_hash(user.password, data['password']):
            return jsonify({"message": "Invalid username or password"}), 401
        
        # Just use the string user_id as identity
        access_token = create_access_token(identity=str(user.id))
        
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
""")

def show_current_auth_code():
    with open('auth.py', 'r') as f:
        content = f.read()
    
    # Try to find the login function
    start = content.find('@auth_bp.route(\'/login\'')
    if start == -1:
        print("Could not find login function in auth.py")
        return
        
    # Find the end of the function
    end = content.find('@auth_bp.route', start + 1)
    if end == -1:
        end = len(content)
        
    print("Current login function code:")
    print(content[start:end])

if __name__ == "__main__":
    print("1. Show current login function code")
    print("2. Show updated login function code")
    option = input("Choose option (1/2): ")
    
    if option == "1":
        show_current_auth_code()
    elif option == "2":
        update_login_function()
    else:
        print("Invalid option")