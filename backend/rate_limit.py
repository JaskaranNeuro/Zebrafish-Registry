from flask import request, jsonify
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from functools import wraps
import time
import re

# Rate limiter configurations
def configure_limiter(app):
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=["200 per day", "50 per hour"],
        storage_uri="memory://",  # Use Redis in production
    )
    
    # Apply stricter limits to sensitive endpoints
    limiter.limit("5 per minute")(app.route('/api/login'))
    limiter.limit("3 per minute")(app.route('/api/register'))
    limiter.limit("10 per minute")(app.route('/api/user'))
    
    return limiter