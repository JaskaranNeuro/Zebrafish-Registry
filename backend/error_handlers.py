from flask import jsonify
import traceback
from werkzeug.exceptions import HTTPException

def register_error_handlers(app):
    """Register error handlers for the Flask app"""
    
    # HTTP exceptions (4xx, 5xx)
    @app.errorhandler(HTTPException)
    def handle_http_exception(e):
        response = {
            "error": e.name,
            "message": e.description,
            "status_code": e.code
        }
        return jsonify(response), e.code
    
    # Generic exception handler
    @app.errorhandler(Exception)
    def handle_exception(e):
        # Log the exception
        app.logger.error(f"Unhandled exception: {str(e)}")
        app.logger.error(traceback.format_exc())
        
        # Don't expose details in production
        if app.debug:
            response = {
                "error": type(e).__name__,
                "message": str(e),
                "traceback": traceback.format_exc().split("\n")
            }
            return jsonify(response), 500
        else:
            response = {
                "error": "Internal Server Error",
                "message": "An unexpected error occurred"
            }
            return jsonify(response), 500
            
    # Invalid JSON request handler
    @app.errorhandler(400)
    def handle_bad_request(e):
        return jsonify({
            "error": "Bad Request",
            "message": "The request could not be understood by the server due to malformed syntax."
        }), 400
        
    # Not found handler
    @app.errorhandler(404)
    def handle_not_found(e):
        return jsonify({
            "error": "Not Found",
            "message": "The requested resource was not found on this server."
        }), 404
        
    # Method not allowed handler
    @app.errorhandler(405)
    def handle_method_not_allowed(e):
        return jsonify({
            "error": "Method Not Allowed",
            "message": f"The method {request.method} is not allowed for this resource."
        }), 405
        
    # Too many requests handler
    @app.errorhandler(429)
    def handle_too_many_requests(e):
        return jsonify({
            "error": "Too Many Requests",
            "message": "You have exceeded the rate limit. Please try again later."
        }), 429