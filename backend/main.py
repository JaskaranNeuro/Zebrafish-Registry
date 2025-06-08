from flask import request
import functions_framework
from app import app as flask_app

@functions_framework.http
def app(request):
    """HTTP Cloud Function that acts as a wrapper for the Flask app."""
    return flask_app(request.environ, start_response)