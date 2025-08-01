# Create a new file named check_facilities.py
from config import app, db
from models_db import FacilityModel, UserModel, SubscriptionModel
from sqlalchemy import text

def check_database_facilities():
    with app.app_context():
        try:
            # Check facilities table
            facilities = FacilityModel.query.all()
            print(f"\nFacilities ({len(facilities)}):")
            for facility in facilities:
                print(f"ID: {facility.id}, Name: {facility.name}, Organization: {facility.organization_name}")
                
            # Check users with facility_id
            users_with_facility = UserModel.query.filter(UserModel.facility_id.isnot(None)).all()
            print(f"\nUsers with facility_id ({len(users_with_facility)}):")
            for user in users_with_facility:
                print(f"ID: {user.id}, Username: {user.username}, Role: {user.role}, Facility ID: {user.facility_id}")
                
            # Check subscriptions
            subscriptions = SubscriptionModel.query.all()
            print(f"\nSubscriptions ({len(subscriptions)}):")
            for sub in subscriptions:
                print(f"ID: {sub.id}, User ID: {sub.user_id}, Facility ID: {sub.facility_id}, Plan: {sub.plan_name}")
                
            # Check your main admin account
            main_admin = UserModel.query.filter_by(username="Jaskaran_Singh").first()
            if main_admin:
                print(f"\nMain admin account:")
                print(f"ID: {main_admin.id}, Facility ID: {main_admin.facility_id}")
                
        except Exception as e:
            print(f"Error checking database: {e}")

if __name__ == "__main__":
    check_database_facilities()