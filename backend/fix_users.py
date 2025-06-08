from config import app, db
from models_db import UserModel, FacilityModel

def list_users():
    with app.app_context():
        users = UserModel.query.all()
        facilities = FacilityModel.query.all()
        
        facility_lookup = {f.id: f.name for f in facilities}
        
        print(f"Total users: {len(users)}")
        for user in users:
            facility_name = facility_lookup.get(user.facility_id, "None")
            print(f"User ID: {user.id}, Username: {user.username}, Role: {user.role}, Facility: {facility_name} (ID: {user.facility_id})")

def assign_user_to_facility():
    with app.app_context():
        # List facilities
        facilities = FacilityModel.query.all()
        print("Available facilities:")
        for facility in facilities:
            print(f"ID: {facility.id}, Name: {facility.name}")
        
        # Get user
        username = input("Enter username to update: ")
        user = UserModel.query.filter_by(username=username).first()
        
        if not user:
            print(f"User {username} not found")
            return
            
        print(f"Found user {user.username} (ID: {user.id})")
        print(f"Current facility ID: {user.facility_id}")
        
        # Get facility
        facility_id = input("Enter facility ID to assign: ")
        if not facility_id:
            print("Operation cancelled")
            return
            
        facility = FacilityModel.query.get(int(facility_id))
        if not facility:
            print(f"Facility with ID {facility_id} not found")
            return
            
        # Update user
        user.facility_id = facility.id
        db.session.commit()
        print(f"Updated {user.username} to facility {facility.name} (ID: {facility.id})")

if __name__ == "__main__":
    print("1. List all users")
    print("2. Assign user to facility")
    choice = input("Enter choice (1/2): ")
    
    if choice == "1":
        list_users()
    elif choice == "2":
        assign_user_to_facility()
    else:
        print("Invalid choice")