from flask import Flask, jsonify
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from models_db import UserModel
from config import db
import sys
from datetime import timedelta
import os

# Create a new Flask app instance for this script only
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:postgres@localhost:5432/zebrafish'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'your-secret-key'  # Match your auth.py secret key
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

# Initialize extensions
jwt = JWTManager(app)
db.init_app(app)

def validate_all_tokens():
    with app.app_context():
        users = UserModel.query.all()
        print(f"Found {len(users)} users")
        
        for user in users:
            # Create token with dict identity
            identity = {
                'user_id': str(user.id),
                'facility_id': user.facility_id
            }
            token = create_access_token(identity=identity)
            print(f"User {user.username} (ID: {user.id}): Token created successfully")

def create_token_for_user(username):
    with app.app_context():
        user = UserModel.query.filter_by(username=username).first()
        if not user:
            print(f"User {username} not found")
            return
            
        print(f"Found user {username} (ID: {user.id}, Facility ID: {user.facility_id})")
        
        # Create token with string identity (simpler approach)
        token = create_access_token(identity=str(user.id))
        print(f"Token for {username} (ID: {user.id}):")
        print(token)
        return token

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Create token for specific user
        create_token_for_user(sys.argv[1])
    else:
        # Validate all tokens
        validate_all_tokens()