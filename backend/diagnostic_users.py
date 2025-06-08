from config import app, db
from models_db import UserModel, FacilityModel
from sqlalchemy import text

def print_all_user_facility_info():
    with app.app_context():
        print("\n--- FACILITIES ---")
        facilities = FacilityModel.query.all()
        for facility in facilities:
            print(f"Facility ID: {facility.id}, Name: {facility.name}, Organization: {facility.organization_name}")

        print("\n--- USERS ---")
        users = UserModel.query.all()
        for user in users:
            facility_name = "None"
            if user.facility_id:
                facility = FacilityModel.query.get(user.facility_id)
                if facility:
                    facility_name = f"{facility.name} (ID: {facility.id})"
                else:
                    facility_name = f"Invalid Facility ID: {user.facility_id}"
                    
            print(f"User ID: {user.id}, Username: {user.username}, Role: {user.role}, Facility: {facility_name}")

def fix_ginger_user():
    with app.app_context():
        # Find Ginger user
        ginger = UserModel.query.filter_by(username='Ginger').first()
        if not ginger:
            print("User Ginger not found")
            return
            
        print(f"Found Ginger (ID: {ginger.id}, Current facility ID: {ginger.facility_id})")
        
        # Find jaskaran19 user to get proper facility
        jaskaran19 = UserModel.query.filter_by(username='jaskaran19').first()
        if not jaskaran19:
            print("User jaskaran19 not found")
            return
            
        print(f"Found jaskaran19 (ID: {jaskaran19.id}, Facility ID: {jaskaran19.facility_id})")
        
        if not jaskaran19.facility_id:
            print("jaskaran19 doesn't have a facility assigned!")
            return
        
        # Update Ginger's facility to match jaskaran19's facility
        ginger.facility_id = jaskaran19.facility_id
        db.session.commit()
        print(f"Updated Ginger's facility ID to {jaskaran19.facility_id}")
        
        # Verify the change
        ginger = UserModel.query.get(ginger.id)  # Refresh from database
        print(f"Ginger now has facility ID: {ginger.facility_id}")

if __name__ == "__main__":
    print("1. Print all user and facility information")
    print("2. Fix Ginger user's facility assignment")
    option = input("Choose an option (1/2): ")
    
    if option == "1":
        print_all_user_facility_info()
    elif option == "2":
        fix_ginger_user()
    else:
        print("Invalid option")