# At the top of your app.py or config.py
from dotenv import load_dotenv
load_dotenv()  # This loads the variables from .env
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from datetime import timedelta
import os
import secrets

# Initialize the app
app = Flask(__name__)

# Generate a secure random key (regenerated on app restart)
# In production, use a persistent secret key stored securely
app.config['SECRET_KEY'] = secrets.token_hex(32)
app.config['JWT_SECRET_KEY'] = secrets.token_hex(32)

# Configure database
# Database URL from environment variable (for Render.com deployment)
DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://postgres:Zebrafishjas@localhost/Zebrafish')

# Handle Render.com PostgreSQL URL format
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Enable CORS with secure configuration
CORS(app, 
    resources={r"/api/*": {
        "origins": [
            "https://zebrafishregistry.web.app",
            "https://zebrafishregistry.firebaseapp.com"
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "X-CSRF-TOKEN", "X-CSRF-TOKEN-ID"],
        "supports_credentials": True,
        "max_age": 120  # Preflight cache time in seconds
    }}
)

# Initialize database
db = SQLAlchemy(app)

# Initialize JWT after app is created
jwt = JWTManager(app)
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)  # Token expiration
app.config['JWT_TOKEN_LOCATION'] = ['headers']
app.config['JWT_HEADER_NAME'] = 'Authorization'
app.config['JWT_HEADER_TYPE'] = 'Bearer'
app.config['JWT_ERROR_MESSAGE_KEY'] = 'message'

# Add to your config.py
# Email settings
app.config['SMTP_SERVER'] = 'sandbox.smtp.mailtrap.io'
app.config['SMTP_PORT'] = 2525
app.config['SMTP_USERNAME'] = 'a03b7db53c082c'  # From Mailtrap dashboard
app.config['SMTP_PASSWORD'] = 'b3f80c932c8997'  # From Mailtrap dashboard

# Add JWT error handlers
@jwt.unauthorized_loader
def custom_unauthorized_response(error_string):
    print(f"JWT unauthorized: {error_string}")
    return jsonify({'message': error_string}), 401

@jwt.invalid_token_loader
def custom_invalid_token(error_string):
    print(f"JWT invalid token: {error_string}")
    return jsonify({'message': error_string}), 422

@jwt.expired_token_loader
def custom_expired_token(jwt_header, jwt_payload):
    print(f"JWT expired: {jwt_payload}")
    return jsonify({'message': 'Token has expired'}), 401

@jwt.needs_fresh_token_loader
def custom_needs_fresh_token(jwt_header, jwt_payload):
    print(f"JWT needs fresh token: {jwt_payload}")
    return jsonify({'message': 'Fresh token required'}), 401