from flask_cors import CORS

def add_cors(app):
    """Configure CORS for Flask application"""
    CORS(app,
         resources={r"/api/*": {
             "origins": [
                 "https://zebrafishregistry.web.app",
                 "https://zebrafishregistry.firebaseapp.com"
             ],
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
             "allow_headers": ["Content-Type", "Authorization"],
             "supports_credentials": True
         }})
    
    # Add CORS headers to all responses
    @app.after_request
    def after_request(response):
        response.headers.add('Access-Control-Allow-Origin', 'https://zebrafishregistry.web.app')
        response.headers.add('Access-Control-Allow-Origin', 'https://zebrafishregistry.firebaseapp.com')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response