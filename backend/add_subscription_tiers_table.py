# Create file: backend/add_subscription_tiers_table.py

from config import app, db
from sqlalchemy import text
from models_db import SubscriptionModel, SubscriptionTierModel
from datetime import datetime, timedelta
import sys

def add_subscription_tiers_table():
    with app.app_context():
        try:
            print("Creating subscription_tiers table...")
            db.session.execute(text("""
                CREATE TABLE IF NOT EXISTS subscription_tiers (
                    id SERIAL PRIMARY KEY,
                    subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
                    plan_name VARCHAR(50) NOT NULL,
                    start_date TIMESTAMP NOT NULL,
                    end_date TIMESTAMP NOT NULL,
                    tier_order INTEGER NOT NULL DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            
            db.session.commit()
            print("Successfully created subscription_tiers table")
            
        except Exception as e:
            db.session.rollback()
            print(f"Error: {str(e)}")
            sys.exit(1)

if __name__ == "__main__":
    add_subscription_tiers_table()