from config import db, app
from werkzeug.security import generate_password_hash
from models_db import UserModel, UserRole
from sqlalchemy import text

def update_facility_manager():
    with app.app_context():
        try:
            # Get the facility manager user
            facility_manager = UserModel.query.filter_by(username='facility_manager').first()
            
            if not facility_manager:
                print("Facility manager user not found!")
                return
                
            print(f"Current facility manager role: {facility_manager.role}")
            
            # Update the role directly
            facility_manager.role = UserRole.FACILITY_MANAGER
            db.session.commit()
            
            # Verify the update
            db.session.refresh(facility_manager)
            print(f"Updated facility manager role: {facility_manager.role}")
            
            print("Facility manager role updated successfully.")
            
        except Exception as e:
            print(f"Error: {e}")
            db.session.rollback()

if __name__ == "__main__":
    update_facility_manager()