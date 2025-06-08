import logging
import os
import json
from datetime import datetime
from flask import request, g
from functools import wraps

# Configure audit logger
def configure_audit_logging():
    # Create logs directory if it doesn't exist
    if not os.path.exists('logs'):
        os.makedirs('logs')
    
    # Set up audit logger
    audit_logger = logging.getLogger('audit')
    audit_logger.setLevel(logging.INFO)
    
    # Create file handler
    handler = logging.FileHandler('logs/audit.log')
    handler.setLevel(logging.INFO)
    
    # Create formatter
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    
    # Add handler to logger
    audit_logger.addHandler(handler)
    
    return audit_logger

# Audit logger instance
audit_logger = configure_audit_logging()

def log_audit(action, user_id=None, details=None, status="success", resource=None, resource_id=None):
    """Log an audit event with common details"""
    if user_id is None and hasattr(g, 'user_id'):
        user_id = g.user_id
        
    log_data = {
        "timestamp": datetime.utcnow().isoformat(),
        "action": action,
        "user_id": user_id,
        "ip_address": get_remote_address(),
        "status": status,
        "resource": resource,
        "resource_id": resource_id,
        "details": details or {},
        "user_agent": request.headers.get('User-Agent', 'Unknown')
    }
    
    audit_logger.info(json.dumps(log_data))
    
    return log_data

# Decorator for auditing routes
def audit_route(action, resource=None):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Try to get the user ID from JWT
            user_id = None
            from flask_jwt_extended import get_jwt_identity
            try:
                user_id = get_jwt_identity()
            except:
                pass
                
            resource_id = kwargs.get('id') or request.view_args.get('id')
            
            # Log before execution
            log_data = {
                "method": request.method,
                "path": request.path,
                "params": dict(request.args),
                "data": request.get_json(silent=True)
            }
            
            log_audit(f"{action} - Started", user_id, log_data, "pending", resource, resource_id)
            
            # Execute route
            try:
                response = f(*args, **kwargs)
                
                # Log successful execution
                result_status = response[1] if isinstance(response, tuple) else 200
                log_audit(action, user_id, {"status_code": result_status}, 
                          "success" if result_status < 400 else "failed", 
                          resource, resource_id)
                        
                return response
                
            except Exception as e:
                # Log exception
                log_audit(action, user_id, {"error": str(e)}, "error", resource, resource_id)
                raise
                
        return decorated_function
    return decorator