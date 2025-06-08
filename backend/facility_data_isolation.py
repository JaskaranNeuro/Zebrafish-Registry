# Create a file named facility_data_isolation.py
from config import app, db
from models_db import UserModel, RackModel, TankModel, BreedingProfileModel, ClinicalCaseModel, FacilityModel
from sqlalchemy import text

def print_facilities_summary():
    with app.app_context():
        # Get all facilities
        facilities = FacilityModel.query.all()
        
        print(f"Found {len(facilities)} facilities:")
        for facility in facilities:
            # Count resources per facility
            user_count = UserModel.query.filter_by(facility_id=facility.id).count()
            rack_count = RackModel.query.filter_by(facility_id=facility.id).count()
            profile_count = BreedingProfileModel.query.filter_by(facility_id=facility.id).count()
            case_count = ClinicalCaseModel.query.filter_by(facility_id=facility.id).count()
            
            print(f"Facility ID {facility.id} - {facility.name}:")
            print(f"  Users: {user_count}")
            print(f"  Racks: {rack_count}")
            print(f"  Breeding Profiles: {profile_count}")
            print(f"  Clinical Cases: {case_count}")
            
            # Show users for this facility
            users = UserModel.query.filter_by(facility_id=facility.id).all()
            print(f"  Users in this facility:")
            for user in users:
                print(f"    - {user.username} (ID: {user.id}, Role: {user.role})")

def verify_facility_data_isolation():
    with app.app_context():
        # Check if any rack doesn't have a facility_id
        racks_without_facility = RackModel.query.filter_by(facility_id=None).count()
        if racks_without_facility > 0:
            print(f"WARNING: Found {racks_without_facility} racks without facility ID")
        
        # Check if any breeding profile doesn't have a facility_id
        profiles_without_facility = BreedingProfileModel.query.filter_by(facility_id=None).count()
        if profiles_without_facility > 0:
            print(f"WARNING: Found {profiles_without_facility} breeding profiles without facility ID")
        
        # Check if any clinical case doesn't have a facility_id
        cases_without_facility = ClinicalCaseModel.query.filter_by(facility_id=None).count()
        if cases_without_facility > 0:
            print(f"WARNING: Found {cases_without_facility} clinical cases without facility ID")
        
        # Check if any user doesn't have a facility_id
        users_without_facility = UserModel.query.filter_by(facility_id=None).count()
        if users_without_facility > 0:
            print(f"WARNING: Found {users_without_facility} users without facility ID")

def fix_data_isolation_issues():
    with app.app_context():
        # Prompt for default facility ID
        try:
            default_facility_id = int(input("Enter default facility ID to use for items without facility: "))
            facility = FacilityModel.query.get(default_facility_id)
            if not facility:
                print(f"Error: No facility found with ID {default_facility_id}")
                return
        except ValueError:
            print("Invalid facility ID")
            return
        
        # Update racks without facility
        racks = RackModel.query.filter_by(facility_id=None).all()
        for rack in racks:
            rack.facility_id = default_facility_id
        
        # Update profiles without facility
        profiles = BreedingProfileModel.query.filter_by(facility_id=None).all()
        for profile in profiles:
            profile.facility_id = default_facility_id
        
        # Update cases without facility
        cases = ClinicalCaseModel.query.filter_by(facility_id=None).all()
        for case in cases:
            case.facility_id = default_facility_id
        
        # Update users without facility
        users = UserModel.query.filter_by(facility_id=None).all()
        for user in users:
            user.facility_id = default_facility_id
        
        db.session.commit()
        print("Updated all items without facility ID")

if __name__ == "__main__":
    print("Zebrafish Registry - Facility Data Isolation Tool")
    print("================================================")
    print("\n1. Facility Summary")
    verify_facility_data_isolation()
    print("\n2. Detailed Facility Report:")
    print_facilities_summary()
    
    if input("\nDo you want to fix data isolation issues? (y/n): ").lower() == 'y':
        fix_data_isolation_issues()