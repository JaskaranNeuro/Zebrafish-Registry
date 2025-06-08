from config import app, db
from models_db import UserModel, FacilityModel
from sqlalchemy import text

def list_users_with_facility():
    with app.app_context():
        users = UserModel.query.all()
        facilities = FacilityModel.query.all()
        
        print("Facilities:")
        for facility in facilities:
            print(f"ID: {facility.id}, Name: {facility.name}, Organization: {facility.organization_name}")
        
        print("\nUsers and their facility assignments:")
        for user in users:
            facility_name = "None"
            if user.facility_id:
                facility = FacilityModel.query.get(user.facility_id)
                if facility:
                    facility_name = facility.name
                    
            print(f"User ID: {user.id}, Username: {user.username}, Role: {user.role}, Facility: {facility_name} (ID: {user.facility_id})")

def fix_user_facility_assignment():
    with app.app_context():
        # Ask for username to fix
        username = input("Enter username to fix: ")
        user = UserModel.query.filter_by(username=username).first()
        
        if not user:
            print(f"User {username} not found")
            return
            
        print(f"Found user {user.username} (ID: {user.id})")
        print(f"Current facility ID: {user.facility_id}")
        
        # List available facilities
        facilities = FacilityModel.query.all()
        print("\nAvailable facilities:")
        for facility in facilities:
            print(f"ID: {facility.id}, Name: {facility.name}")
            
        # Get facility to assign
        facility_id = input("\nEnter facility ID to assign (or empty to cancel): ")
        if not facility_id:
            print("Operation cancelled")
            return
            
        try:
            facility_id = int(facility_id)
            facility = FacilityModel.query.get(facility_id)
            if not facility:
                print(f"Facility ID {facility_id} not found")
                return
                
            # Update user facility
            user.facility_id = facility_id
            db.session.commit()
            print(f"Updated {user.username} to facility {facility.name} (ID: {facility.id})")
        except ValueError:
            print("Invalid facility ID")
            return

if __name__ == "__main__":
    print("1. List users with facility assignments")
    print("2. Fix user facility assignment")
    option = input("Choose option (1/2): ")
    
    if option == "1":
        list_users_with_facility()
    elif option == "2":
        fix_user_facility_assignment()
    else:
        print("Invalid option")