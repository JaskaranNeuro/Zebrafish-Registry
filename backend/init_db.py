"""
Initialize database for Zebrafish Registry
"""
from app import app, db
from models_db import *

def init_db():
    """Initialize the database with all tables"""
    with app.app_context():
        # Create all tables
        db.create_all()
        print("Database tables created successfully!")
        
        # You can add any default data here if needed
        # For example, default facilities, user roles, etc.
        
if __name__ == "__main__":
    init_db()
