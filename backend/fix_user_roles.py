from config import app, db
from models_db import UserModel, FacilityModel, UserRole
from sqlalchemy import text

def diagnose_user_roles():
    with app.app_context():
        print("Diagnosing user roles...")
        
        # Get all users
        users = UserModel.query.all()
        print(f"Total users: {len(users)}")
        
        # Check each user's role format
        for user in users:
            role = user.role
            print(f"User: {user.username} (ID: {user.id})")
            print(f"  Role type: {type(role)}")
            print(f"  Role value: {role}")
            if hasattr(role, 'value'):
                print(f"  Role.value: {role.value}")
            print(f"  Str(Role): {str(role)}")
            print(f"  Facility ID: {user.facility_id}")
            
            # Check if facility exists
            if user.facility_id:
                facility = FacilityModel.query.get(user.facility_id)
                print(f"  Facility: {facility.name if facility else 'Not found'}")
            else:
                print("  No facility assigned")
            print()

def ensure_proper_user_roles():
    with app.app_context():
        # Get all users where role might not be the enum
        users = UserModel.query.all()
        
        for user in users:
            role = user.role
            # Check if we need to convert the role string to enum
            if isinstance(role, str):
                print(f"Converting role for user {user.username} from string '{role}' to enum")
                
                if role.upper() == 'ADMIN':
                    user.role = UserRole.ADMIN
                elif role.upper() == 'RESEARCHER':
                    user.role = UserRole.RESEARCHER
                elif role.upper() == 'FACILITY_MANAGER' or role.upper() == 'CLINICAL_MANAGER':
                    user.role = UserRole.FACILITY_MANAGER
                else:
                    print(f"  Unknown role: {role}")
                    
        db.session.commit()
        print("User roles have been updated to use proper enum types")

def assign_missing_facilities():
    with app.app_context():
        # Get users with missing facility_id
        users_without_facility = UserModel.query.filter(UserModel.facility_id.is_(None)).all()
        
        if not users_without_facility:
            print("No users without facility found")
            return
            
        print(f"Found {len(users_without_facility)} users without facility")
        
        # List all facilities
        facilities = FacilityModel.query.all()
        if not facilities:
            print("No facilities found. Please create a facility first.")
            return
            
        print("Available facilities:")
        for i, facility in enumerate(facilities):
            print(f"{i+1}. {facility.name} (ID: {facility.id})")
            
        choice = input("Select facility to assign (number) or 'q' to quit: ")
        if choice.lower() == 'q':
            return
            
        try:
            facility = facilities[int(choice) - 1]
            
            # Update users
            for user in users_without_facility:
                user.facility_id = facility.id
                print(f"Assigning user {user.username} to facility: {facility.name} (ID: {facility.id})")
                
            db.session.commit()
            print(f"Updated {len(users_without_facility)} users")
            
        except (IndexError, ValueError):
            print("Invalid choice")

if __name__ == "__main__":
    print("1. Diagnose user roles")
    print("2. Fix user roles (convert strings to enums)")
    print("3. Assign facility to users without facility")
    
    choice = input("Select option: ")
    
    if choice == "1":
        diagnose_user_roles()
    elif choice == "2":
        ensure_proper_user_roles()
    elif choice == "3":
        assign_missing_facilities()
    else:
        print("Invalid choice")