# Create a file named facility_data_isolation.py
from config import app, db
from models_db import UserModel, RackModel, TankModel, BreedingProfileModel, ClinicalCaseModel
from sqlalchemy import text

def print_facilities_summary():
    with app.app_context():
        # Get all facilities
        facilities = db.session.execute(text("SELECT id, name FROM facilities")).fetchall()
        
        print(f"Found {len(facilities)} facilities:")
        for facility in facilities:
            facility_id = facility[0]
            facility_name = facility[1]
            
            # Count resources per facility
            user_count = db.session.execute(text(
                f"SELECT COUNT(*) FROM users WHERE facility_id = {facility_id}"
            )).scalar()
            
            rack_count = db.session.execute(text(
                f"SELECT COUNT(*) FROM racks WHERE facility_id = {facility_id}"
            )).scalar()
            
            profile_count = db.session.execute(text(
                f"SELECT COUNT(*) FROM breeding_profiles WHERE facility_id = {facility_id}"
            )).scalar()
            
            case_count = db.session.execute(text(
                f"SELECT COUNT(*) FROM clinical_cases WHERE facility_id = {facility_id}"
            )).scalar()
            
            print(f"Facility ID {facility_id} - {facility_name}:")
            print(f"  Users: {user_count}")
            print(f"  Racks: {rack_count}")
            print(f"  Breeding Profiles: {profile_count}")
            print(f"  Clinical Cases: {case_count}")

def verify_facility_data_isolation():
    with app.app_context():
        # Check if any rack doesn't have a facility_id
        racks_without_facility = db.session.execute(text(
            "SELECT COUNT(*) FROM racks WHERE facility_id IS NULL"
        )).scalar()
        
        if racks_without_facility > 0:
            print(f"WARNING: Found {racks_without_facility} racks without facility ID")
        
        # Check if any breeding profile doesn't have a facility_id
        profiles_without_facility = db.session.execute(text(
            "SELECT COUNT(*) FROM breeding_profiles WHERE facility_id IS NULL"
        )).scalar()
        
        if profiles_without_facility > 0:
            print(f"WARNING: Found {profiles_without_facility} breeding profiles without facility ID")
        
        # Check if any clinical case doesn't have a facility_id
        cases_without_facility = db.session.execute(text(
            "SELECT COUNT(*) FROM clinical_cases WHERE facility_id IS NULL"
        )).scalar()
        
        if cases_without_facility > 0:
            print(f"WARNING: Found {cases_without_facility} clinical cases without facility ID")

if __name__ == "__main__":
    print_facilities_summary()
    verify_facility_data_isolation()