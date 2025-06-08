from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token, decode_token, get_jwt_identity
import sys
from datetime import datetime, timedelta
import json

app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = 'your-secret-key'  # Match your auth.py secret key
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
jwt = JWTManager(app)

def debug_token(token_string):
    try:
        with app.app_context():
            decoded = decode_token(token_string)
            print(f"Successfully decoded token: {decoded}")
            print(f"Identity (sub): {decoded.get('sub')}")
            print(f"Expiration: {datetime.fromtimestamp(decoded.get('exp')).isoformat()}")
            return True
    except Exception as e:
        print(f"Error decoding token: {e}")
        return False

def create_test_token(user_id=8, facility_id=1):  # Use your admin user ID
    with app.app_context():
        # Always use a dict with string user_id for identity
        identity = {
            'user_id': str(user_id),
            'facility_id': facility_id
        }
        token = create_access_token(identity=identity)
        print(f"Created token: {token}")
        # Test decoding it right away
        debug_token(token)
        return token

def create_test_token_simple():
    with app.app_context():
        # Create a simple token with a string identity
        token = create_access_token(identity="test-user")
        print(f"Simple token (string identity): {token}")
        return token

def create_test_token_complex():
    with app.app_context():
        # Create a more complex token with a dictionary identity
        token = create_access_token(identity="8")  # Use a string ID
        print(f"Complex token (string user ID): {token}")
        return token

if __name__ == "__main__":
    print("Creating test tokens...")
    simple_token = create_test_token_simple()
    complex_token = create_test_token_complex()
    
    print("\nUse these tokens for testing:")
    print(f"Simple token: {simple_token}")
    print(f"Complex token: {complex_token}")
    token = create_test_token()
    print("\nUse this token for testing:")
    print(token)