# Create a file: migration_subscriptions.py
from datetime import datetime, timedelta
from config import app, db
from models_db import SubscriptionModel, FacilityModel
from sqlalchemy import text, inspect

def migrate_subscription_model():
    with app.app_context():
        inspector = inspect(db.engine)
        
        print("Checking database structure...")
        
        # Check if subscriptions table exists
        if 'subscriptions' not in inspector.get_table_names():
            print("Subscriptions table doesn't exist, creating it...")
            db.create_all()
            return True
        else:
            print("Subscriptions table exists, checking columns...")
            
            # Get existing columns
            existing_columns = {col['name'] for col in inspector.get_columns('subscriptions')}
            print(f"Existing columns: {existing_columns}")
            
            # Define expected columns based on your model
            expected_columns = {
                'id', 'facility_id', 'plan_name', 'start_date', 
                'end_date', 'max_users', 'max_racks', 'is_active', 'payment_id'
            }
            
            # Find missing columns
            missing_columns = expected_columns - existing_columns
            
            if missing_columns:
                print(f"Missing columns: {missing_columns}")
                print("Adding missing columns...")
                
                try:
                    # Add each missing column
                    for column in missing_columns:
                        if column == 'start_date':
                            db.session.execute(text(
                                "ALTER TABLE subscriptions ADD COLUMN start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
                            ))
                        elif column == 'end_date':
                            # Check if you have expiration_date instead
                            if 'expiration_date' in existing_columns:
                                print("Renaming expiration_date to end_date")
                                db.session.execute(text(
                                    "ALTER TABLE subscriptions RENAME COLUMN expiration_date TO end_date"
                                ))
                            else:
                                db.session.execute(text(
                                    "ALTER TABLE subscriptions ADD COLUMN end_date TIMESTAMP"
                                ))
                        elif column == 'payment_id':
                            db.session.execute(text(
                                "ALTER TABLE subscriptions ADD COLUMN payment_id VARCHAR"
                            ))
                        elif column == 'is_active':
                            db.session.execute(text(
                                "ALTER TABLE subscriptions ADD COLUMN is_active BOOLEAN DEFAULT TRUE"
                            ))
                        elif column == 'max_racks':
                            db.session.execute(text(
                                "ALTER TABLE subscriptions ADD COLUMN max_racks INTEGER DEFAULT 5"
                            ))
                    
                    db.session.commit()
                    print("Columns added successfully")
                except Exception as e:
                    db.session.rollback()
                    print(f"Error adding columns: {e}")
                    return False
            else:
                print("All expected columns exist")
        
        print("Database schema updated")
        return True

def setup_unlimited_subscriptions():
    with app.app_context():
        # Run migration first
        if not migrate_subscription_model():
            print("Migration failed, stopping")
            return
            
        # Important: Create a new session after schema changes to avoid cached metadata issues
        db.session.close()
        db.engine.dispose()
        
        # Now proceed with updating subscriptions
        facilities = FacilityModel.query.all()
        print(f"Found {len(facilities)} facilities")
        
        for facility in facilities:
            try:
                # Use direct SQL instead of ORM to avoid metadata issues
                # First check if subscription exists
                result = db.session.execute(text(
                    f"SELECT id FROM subscriptions WHERE facility_id = {facility.id} LIMIT 1"
                )).fetchone()
                
                if result:
                    subscription_id = result[0]
                    print(f"Updating existing subscription ID {subscription_id} for {facility.name}")
                    
                    # Update using direct SQL
                    db.session.execute(text(f"""
                        UPDATE subscriptions 
                        SET plan_name = 'UNLIMITED',
                            max_users = 999,
                            max_racks = 999,
                            end_date = CURRENT_TIMESTAMP + INTERVAL '3650 days',
                            is_active = TRUE,
                            start_date = CASE WHEN start_date IS NULL THEN CURRENT_TIMESTAMP ELSE start_date END
                        WHERE id = {subscription_id}
                    """))
                else:
                    print(f"Creating unlimited subscription for {facility.name}")
                    # Insert using direct SQL
                    db.session.execute(text(f"""
                        INSERT INTO subscriptions
                        (facility_id, plan_name, start_date, end_date, max_users, max_racks, is_active) 
                        VALUES 
                        ({facility.id}, 'UNLIMITED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '3650 days', 999, 999, TRUE)
                    """))
                
                # Commit after each facility to avoid losing all work if one fails
                db.session.commit()
                print(f"Successfully processed facility {facility.name}")
                
            except Exception as e:
                db.session.rollback()
                print(f"Error processing facility {facility.name}: {str(e)}")
        
        print("All facilities now have unlimited subscriptions")

if __name__ == "__main__":
    setup_unlimited_subscriptions()