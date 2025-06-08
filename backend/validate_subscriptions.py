# filepath: /d:/Zebrafish registry VS code/backend/validate_subscriptions.py
from config import app, db
from models_db import SubscriptionModel, FacilityModel
from sqlalchemy import text
from datetime import datetime

def validate_subscriptions():
    with app.app_context():
        try:
            # Check facilities and subscriptions
            facilities = FacilityModel.query.all()
            print(f"Found {len(facilities)} facilities:")
            
            for facility in facilities:
                print(f"\nFacility: {facility.name} (ID: {facility.id})")
                
                # Use direct SQL to check subscriptions
                subs = db.session.execute(text(
                    f"SELECT id, plan_name, max_users, max_racks, is_active, end_date FROM subscriptions WHERE facility_id = {facility.id}"
                )).fetchall()
                
                if subs:
                    print(f"  Subscriptions: {len(subs)}")
                    for sub in subs:
                        sub_id, plan, max_users, max_racks, is_active, end_date = sub
                        print(f"  - ID: {sub_id}, Plan: {plan}, Max Users: {max_users}, Max Racks: {max_racks}")
                        print(f"    Active: {is_active}, Expires: {end_date}")
                        
                        # Check if end_date is set properly
                        if end_date is None:
                            print("    WARNING: end_date is NULL, fixing...")
                            db.session.execute(text(
                                f"UPDATE subscriptions SET end_date = CURRENT_TIMESTAMP + INTERVAL '3650 days' WHERE id = {sub_id}"
                            ))
                            db.session.commit()
                else:
                    print("  No subscriptions found!")
                    create = input(f"Create unlimited subscription for {facility.name}? (y/n): ")
                    if create.lower() == 'y':
                        db.session.execute(text(f"""
                            INSERT INTO subscriptions
                            (facility_id, plan_name, start_date, end_date, max_users, max_racks, is_active) 
                            VALUES 
                            ({facility.id}, 'UNLIMITED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '3650 days', 999, 999, TRUE)
                        """))
                        db.session.commit()
                        print("  Created unlimited subscription")
                        
        except Exception as e:
            print(f"Error validating subscriptions: {e}")

if __name__ == "__main__":
    validate_subscriptions()