from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import json
import os
import requests
from config import db, app
from models_db import UserModel
from auth import admin_required

# Create a Blueprint for MCP routes
mcp_bp = Blueprint('mcp', __name__)

# MCP protocol constants
MCP_VERSION = "0.1"
MCP_TOKEN = os.environ.get("GITHUB_COPILOT_TOKEN", "")
MCP_ENDPOINT = "https://api.githubcopilot.com/mcp"

@mcp_bp.route('/api/mcp/health', methods=['GET'])
def health_check():
    """Health check endpoint for the MCP server"""
    return jsonify({
        "status": "healthy",
        "version": MCP_VERSION,
        "serverTime": str(db.func.now())
    }), 200

@mcp_bp.route('/api/mcp/context', methods=['POST'])
@jwt_required()
def get_context():
    """
    MCP endpoint to provide context about the zebrafish database.
    This implements the Context Provider part of the MCP spec.
    """
    try:
        user_id = get_jwt_identity()
        user = UserModel.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        # Get query from request
        data = request.get_json()
        if not data or 'query' not in data:
            return jsonify({"error": "No query provided"}), 400
            
        query = data['query']
        
        # Log the request for debugging
        app.logger.info(f"MCP context request from user {user.username}: {query}")
        
        # Collect context based on user's role and facility
        context_data = {}
        
        # Add facility information if available
        if hasattr(user, 'facility_id') and user.facility_id:
            from sqlalchemy import text
            # Get facility information
            facility_query = text("""
                SELECT f.* FROM facilities f 
                WHERE f.id = :facility_id
            """)
            facility_result = db.session.execute(facility_query, {'facility_id': user.facility_id}).fetchone()
            
            if facility_result:
                context_data["facility"] = {
                    "id": facility_result.id,
                    "name": facility_result.name,
                    "organization": getattr(facility_result, "organization_name", "Unknown")
                }
        
        # Add rack and tank statistics based on user permissions
        if user.role in ['ADMIN', 'SUPER_ADMIN', 'FACILITY_MANAGER']:
            # Get rack stats
            racks_query = text("""
                SELECT COUNT(*) as rack_count FROM racks
                WHERE facility_id = :facility_id
            """)
            rack_result = db.session.execute(racks_query, {'facility_id': user.facility_id}).fetchone()
            
            # Get tank stats
            tanks_query = text("""
                SELECT COUNT(*) as tank_count FROM tanks t
                JOIN racks r ON t.rack_id = r.id
                WHERE r.facility_id = :facility_id
            """)
            tank_result = db.session.execute(tanks_query, {'facility_id': user.facility_id}).fetchone()
            
            context_data["stats"] = {
                "racks": rack_result.rack_count if rack_result else 0,
                "tanks": tank_result.tank_count if tank_result else 0
            }
            
        # Return the MCP context response
        return jsonify({
            "mcp_version": MCP_VERSION,
            "context": context_data,
            "query": query,
            "user": {
                "id": user.id,
                "username": user.username,
                "role": user.role
            }
        }), 200
        
    except Exception as e:
        app.logger.error(f"Error in MCP context: {str(e)}")
        return jsonify({"error": str(e)}), 500

@mcp_bp.route('/api/mcp/chat', methods=['POST'])
@jwt_required()
def chat():
    """
    MCP endpoint for chat functionality.
    This connects to GitHub Copilot via the MCP protocol.
    """
    try:
        user_id = get_jwt_identity()
        user = UserModel.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        # Get message from request
        data = request.get_json()
        if not data or 'message' not in data:
            return jsonify({"error": "No message provided"}), 400
            
        message = data['message']
        conversation_id = data.get('conversation_id', None)
        
        # Get context for this user/facility
        context = _get_user_context(user)
        
        # Prepare the request to GitHub Copilot MCP API
        mcp_request = {
            "version": MCP_VERSION,
            "messages": [
                {
                    "role": "user",
                    "content": message
                }
            ],
            "context": context
        }
        
        if conversation_id:
            mcp_request["conversation_id"] = conversation_id
            
        # Log the outgoing request for debugging
        app.logger.info(f"Sending MCP request to Copilot: {json.dumps(mcp_request, indent=2)}")
            
        # Check if we have a valid token
        if not MCP_TOKEN:
            # For development/demo, return a mock response
            response = {
                "conversation_id": conversation_id or "mcp-demo-123",
                "response": {
                    "role": "assistant",
                    "content": f"This is a demonstration of the MCP server. In production, this would connect to GitHub Copilot. You sent: '{message}'",
                }
            }
        else:
            # Make the actual API call to GitHub Copilot
            copilot_response = requests.post(
                MCP_ENDPOINT,
                headers={
                    "Authorization": f"Bearer {MCP_TOKEN}",
                    "Content-Type": "application/json"
                },
                json=mcp_request
            )
            
            if copilot_response.status_code != 200:
                app.logger.error(f"Error from Copilot API: {copilot_response.text}")
                return jsonify({
                    "error": "Failed to get response from AI service",
                    "details": copilot_response.text
                }), 500
                
            response = copilot_response.json()
        
        # Return the response
        return jsonify(response), 200
        
    except Exception as e:
        app.logger.error(f"Error in MCP chat: {str(e)}")
        return jsonify({"error": str(e)}), 500

def _get_user_context(user):
    """Helper function to get relevant context for a user"""
    context = {
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role
        },
        "application": "Zebrafish Registry",
        "timestamp": str(db.func.now())
    }
    
    # Add facility context if available
    if hasattr(user, 'facility_id') and user.facility_id:
        from models_db import FacilityModel
        facility = FacilityModel.query.get(user.facility_id)
        if facility:
            context["facility"] = {
                "id": facility.id,
                "name": facility.name
            }
    
    return context