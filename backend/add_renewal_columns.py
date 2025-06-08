from config import app, db
from sqlalchemy import text

def add_renewal_columns():
    with app.app_context():
        try:
            print("Adding auto-renewal columns to subscriptions table...")
            
            # Add auto_renew column
            db.session.execute(text("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'subscriptions' AND column_name = 'auto_renew'
                    ) THEN
                        ALTER TABLE subscriptions ADD COLUMN auto_renew BOOLEAN DEFAULT TRUE;
                    END IF;
                END
                $$;
            """))
            
            # Add renewal_period column
            db.session.execute(text("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'subscriptions' AND column_name = 'renewal_period'
                    ) THEN
                        ALTER TABLE subscriptions ADD COLUMN renewal_period VARCHAR(50) DEFAULT '1_month';
                    END IF;
                END
                $$;
            """))
            
            # Add payment_method_id column
            db.session.execute(text("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'subscriptions' AND column_name = 'payment_method_id'
                    ) THEN
                        ALTER TABLE subscriptions ADD COLUMN payment_method_id VARCHAR(255);
                    END IF;
                END
                $$;
            """))
            
            db.session.commit()
            print("Successfully added auto-renewal columns to subscriptions table.")
            
        except Exception as e:
            db.session.rollback()
            print(f"Error adding columns: {str(e)}")

if __name__ == "__main__":
    add_renewal_columns()