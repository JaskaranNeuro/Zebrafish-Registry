# Create a new file: setup_unlimited_subscriptions.py
from datetime import datetime, timedelta
from config import app, db
from models_db import FacilityModel, SubscriptionModel

def setup_unlimited_subscriptions():
    with app.app_context():
        facilities = FacilityModel.query.all()
        print(f"Found {len(facilities)} facilities")
        
        for facility in facilities:
            # Check if facility already has a subscription
            existing_subscription = SubscriptionModel.query.filter_by(facility_id=facility.id).first()
            
            if existing_subscription:
                print(f"Updating existing subscription for {facility.name}")
                # Set unlimited values
                existing_subscription.plan_name = "UNLIMITED"
                existing_subscription.max_users = 999
                existing_subscription.max_racks = 999
                # Set expiration date far in the future (10 years)
                existing_subscription.end_date = datetime.utcnow() + timedelta(days=3650)
                existing_subscription.is_active = True
            else:
                print(f"Creating unlimited subscription for {facility.name}")
                # Create new unlimited subscription
                subscription = SubscriptionModel(
                    facility_id=facility.id,
                    plan_name="UNLIMITED",
                    start_date=datetime.utcnow(),
                    end_date=datetime.utcnow() + timedelta(days=3650),  # 10 years
                    max_users=999,
                    max_racks=999,
                    is_active=True
                )
                db.session.add(subscription)
            
        db.session.commit()
        print("All facilities now have unlimited subscriptions")

if __name__ == "__main__":
    setup_unlimited_subscriptions()