from config import app
from auth import auth_bp
from admin import admin_bp
from super_admin_routes import super_admin_bp
from subscription import subscription_bp
from tenant import tenant_bp
from mcp_server import mcp_bp  # Add this import

def register_all_blueprints():
    """Register all blueprints with the Flask application"""
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(super_admin_bp, url_prefix='/api/super-admin')
    app.register_blueprint(subscription_bp, url_prefix='/api/subscription')
    app.register_blueprint(tenant_bp)
    app.register_blueprint(mcp_bp)  # Add this line to register the MCP blueprint
    
    print("All blueprints registered successfully")

# Call this function in your main app.py