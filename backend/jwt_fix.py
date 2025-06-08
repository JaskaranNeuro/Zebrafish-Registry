from flask import Flask, jsonify, request
from flask_jwt_extended import JWTManager, create_access_token, decode_token
from datetime import datetime, timedelta
import sys

app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = 'your-secret-key'  # Same key as in your main app
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
jwt = JWTManager(app)

@app.route('/debug-token', methods=['POST'])
def debug_token():
    """Endpoint to debug JWT tokens"""
    data = request.json
    token = data.get('token')
    
    try:
        # Try to decode the token
        decoded = decode_token(token)
        return jsonify({
            "success": True,
            "decoded": {
                "identity": decoded.get('sub'),
                "type": decoded.get('type'),
                "fresh": decoded.get('fresh'),
                "iat": datetime.fromtimestamp(decoded.get('iat')).isoformat() if decoded.get('iat') else None,
                "exp": datetime.fromtimestamp(decoded.get('exp')).isoformat() if decoded.get('exp') else None,
                "jti": decoded.get('jti')
            }
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        })

@app.route('/create-token', methods=['POST'])
def create_token():
    """Create a test token"""
    data = request.json
    identity = data.get('identity', "1")  # Default to user ID 1 as a string
    
    token = create_access_token(identity=str(identity))  # Convert to string
    return jsonify({
        "token": token
    })

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'debug':
        # Run in debug mode
        app.run(debug=True, port=5001)
    else:
        # Create a test token for user ID 1
        with app.app_context():
            token = create_access_token(identity=str(1))  # Convert to string
            print(f"Test token for user ID 1: {token}")
            
            try:
                decoded = decode_token(token)
                print(f"Decoded token: {decoded}")
            except Exception as e:
                print(f"Error decoding token: {e}")