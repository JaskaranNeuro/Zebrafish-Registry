from flask import Flask
from flask_jwt_extended import JWTManager
from datetime import timedelta

# Create a basic configuration file to test JWT settings
app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = 'your-secret-key'  # Make sure this matches auth.py
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

jwt = JWTManager(app)

if __name__ == "__main__":
    print("JWT configuration is valid.")
    print(f"JWT_SECRET_KEY is set: {'JWT_SECRET_KEY' in app.config}")
    print(f"JWT Secret Key: {app.config['JWT_SECRET_KEY']}")
    print(f"JWT Token expiration: {app.config['JWT_ACCESS_TOKEN_EXPIRES']}")
    
    print("\nMake sure these values match what's in your auth.py file:")
    print("app.config['JWT_SECRET_KEY'] = 'your-secret-key'")
    print("app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)")