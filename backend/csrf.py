from flask import Blueprint, request, jsonify, session
from functools import wraps
import secrets
import time

csrf_bp = Blueprint('csrf', __name__)

# CSRF token store - In production, use Redis
csrf_tokens = {}

def generate_csrf_token():
    """Generate a unique CSRF token"""
    token_id = secrets.token_hex(8)
    token_value = secrets.token_hex(32)
    expires = int(time.time()) + 3600  # 1 hour expiration
    
    # Store token with its ID
    csrf_tokens[token_id] = {
        "value": token_value,
        "expires": expires
    }
    
    # Clean up expired tokens occasionally
    cleanup_expired_tokens()
    
    return token_id, token_value

def validate_csrf_token(token_id, token_value):
    """Validate CSRF token against stored value"""
    if token_id not in csrf_tokens:
        return False
        
    token_data = csrf_tokens[token_id]
    
    # Check if expired
    if int(time.time()) > token_data["expires"]:
        del csrf_tokens[token_id]
        return False
        
    # Check if token matches
    if token_value != token_data["value"]:
        return False
        
    # Valid token, remove after use (single-use token)
    del csrf_tokens[token_id]
    return True

def cleanup_expired_tokens():
    """Remove expired tokens"""
    current_time = int(time.time())
    to_delete = []
    
    for token_id, data in csrf_tokens.items():
        if current_time > data["expires"]:
            to_delete.append(token_id)
            
    for token_id in to_delete:
        del csrf_tokens[token_id]

def csrf_required(f):
    """Decorator to enforce CSRF protection"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Skip CSRF check for GET, OPTIONS, and HEAD requests
        if request.method in ['GET', 'OPTIONS', 'HEAD']:
            return f(*args, **kwargs)
            
        # Get CSRF tokens from headers or form
        token_id = request.headers.get('X-CSRF-TOKEN-ID')
        token_value = request.headers.get('X-CSRF-TOKEN')
        
        # If not in headers, check form data
        if not token_id or not token_value:
            token_id = request.form.get('csrf_token_id')
            token_value = request.form.get('csrf_token')
            
        # If not in form, check JSON data
        if not token_id or not token_value:
            json_data = request.get_json(silent=True)
            if json_data and isinstance(json_data, dict):
                token_id = json_data.get('csrf_token_id')
                token_value = json_data.get('csrf_token')
                
        # Validate token
        if not token_id or not token_value or not validate_csrf_token(token_id, token_value):
            return jsonify({"message": "Invalid or expired CSRF token"}), 403
            
        return f(*args, **kwargs)
    return decorated_function

@csrf_bp.route('/api/csrf-token', methods=['GET'])
def get_csrf_token():
    """Get a new CSRF token"""
    token_id, token_value = generate_csrf_token()
    return jsonify({
        "token_id": token_id,
        "token_value": token_value
    })