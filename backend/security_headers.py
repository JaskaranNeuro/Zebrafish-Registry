from flask import request

def add_security_headers(response):
    """Add security headers to all responses"""
    
    # Basic XSS protection
    response.headers['X-XSS-Protection'] = '1; mode=block'
    
    # Prevent MIME type sniffing
    response.headers['X-Content-Type-Options'] = 'nosniff'
    
    # Prevent clickjacking
    response.headers['X-Frame-Options'] = 'DENY'
    
    # HTTP Strict Transport Security (HSTS)
    # Commented out for local development, uncomment for production
    # response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    
    # Content Security Policy (CSP)
    csp = "default-src 'self'; "
    csp += "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
    csp += "style-src 'self' 'unsafe-inline'; "
    csp += "img-src 'self' data:; "
    csp += "font-src 'self'; "
    csp += "connect-src 'self' localhost:* 127.0.0.1:*; "
    csp += "frame-src 'self'"
    response.headers['Content-Security-Policy'] = csp
    
    # Add CORS headers
    response.headers["Access-Control-Allow-Origin"] = request.headers.get('Origin', 'http://localhost:3000')
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-CSRF-TOKEN, X-CSRF-TOKEN-ID"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    
    return response