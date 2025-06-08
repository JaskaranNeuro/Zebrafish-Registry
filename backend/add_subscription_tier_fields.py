# Create file: backend/add_subscription_tier_fields.py
from config import app, db
from sqlalchemy import text

def add_subscription_tier_fields():
    with app.app_context():
        try:
            # Add original_plan_name and original_plan_end_date columns if they don't exist
            db.session.execute(text("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'subscriptions' AND column_name = 'original_plan_name'
                    ) THEN
                        ALTER TABLE subscriptions ADD COLUMN original_plan_name VARCHAR(50);
                    END IF;
                    
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'subscriptions' AND column_name = 'original_plan_end_date'
                    ) THEN
                        ALTER TABLE subscriptions ADD COLUMN original_plan_end_date TIMESTAMP;
                    END IF;
                END
                $$;
            """))
            
            # Set initial values - copy current values to original fields for existing subscriptions
            db.session.execute(text("""
                UPDATE subscriptions
                SET original_plan_name = plan_name,
                    original_plan_end_date = end_date
                WHERE original_plan_name IS NULL;
            """))
            
            db.session.commit()
            print("Successfully added subscription tier fields")
            
        except Exception as e:
            db.session.rollback()
            print(f"Error: {str(e)}")

def migrate_existing_tiers():
    with app.app_context():
        try:
            print("Migrating existing tiered subscriptions...")
            # Find all subscriptions with original_plan_name and original_plan_end_date set
            subscriptions = SubscriptionModel.query.filter(
                SubscriptionModel.original_plan_name.isnot(None),
                SubscriptionModel.original_plan_end_date.isnot(None)
            ).all()
            
            for subscription in subscriptions:
                # Create a tier from the original plan data
                tier = SubscriptionTierModel(
                    subscription_id=subscription.id,
                    plan_name=subscription.original_plan_name,
                    start_date=subscription.end_date,
                    end_date=subscription.original_plan_end_date,
                    tier_order=1
                )
                db.session.add(tier)
            
            db.session.commit()
            print(f"Migrated {len(subscriptions)} existing tiered subscriptions")
            
        except Exception as e:
            db.session.rollback()
            print(f"Error: {str(e)}")

if __name__ == "__main__":
    add_subscription_tier_fields()
    migrate_existing_tiers()