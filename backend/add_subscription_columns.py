from config import app, db
import sys
from sqlalchemy import text

def add_missing_columns():
    with app.app_context():
        try:
            print("Adding missing columns to subscriptions table...")
            
            # Add original_plan_name if missing
            db.session.execute(text("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'subscriptions' AND column_name = 'original_plan_name'
                    ) THEN
                        ALTER TABLE subscriptions ADD COLUMN original_plan_name VARCHAR(50);
                    END IF;
                END
                $$;
            """))
            
            # Add original_plan_end_date if missing
            db.session.execute(text("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'subscriptions' AND column_name = 'original_plan_end_date'
                    ) THEN
                        ALTER TABLE subscriptions ADD COLUMN original_plan_end_date TIMESTAMP;
                    END IF;
                END
                $$;
            """))
            
            db.session.commit()
            print("Successfully added missing columns to subscriptions table.")
            
        except Exception as e:
            db.session.rollback()
            print(f"Error adding columns: {str(e)}")

if __name__ == "__main__":
    add_missing_columns()