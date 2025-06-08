# filepath: /d:/Zebrafish registry VS code/backend/fix_subscription_table.py
from config import app, db
from sqlalchemy import text

def fix_subscription_table():
    with app.app_context():
        try:
            # Check if expiration_date exists and end_date doesn't
            db.session.execute(text("""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'subscriptions' AND column_name = 'expiration_date'
                    ) AND NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'subscriptions' AND column_name = 'end_date'
                    ) THEN
                        ALTER TABLE subscriptions RENAME COLUMN expiration_date TO end_date;
                    END IF;
                END
                $$;
            """))
            
            # Add any missing columns
            columns_to_add = [
                ("start_date", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
                ("end_date", "TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')"),
                ("max_racks", "INTEGER DEFAULT 5"),
                ("is_active", "BOOLEAN DEFAULT TRUE"),
                ("payment_id", "VARCHAR")
            ]
            
            for column_name, data_type in columns_to_add:
                db.session.execute(text(f"""
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM information_schema.columns 
                            WHERE table_name = 'subscriptions' AND column_name = '{column_name}'
                        ) THEN
                            ALTER TABLE subscriptions ADD COLUMN {column_name} {data_type};
                        END IF;
                    END
                    $$;
                """))
            
            db.session.commit()
            print("Successfully fixed subscription table schema")
            
        except Exception as e:
            db.session.rollback()
            print(f"Error fixing subscription table: {e}")
            
if __name__ == "__main__":
    fix_subscription_table()