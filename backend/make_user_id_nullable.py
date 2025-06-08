# Create a file: make_user_id_nullable.py
from config import app, db
from sqlalchemy import text

def make_user_id_nullable():
    with app.app_context():
        try:
            # Make user_id column nullable in subscriptions table
            db.session.execute(text("""
                ALTER TABLE subscriptions ALTER COLUMN user_id DROP NOT NULL;
            """))
            db.session.commit()
            print("Made user_id nullable in subscriptions table")
        except Exception as e:
            db.session.rollback()
            print(f"Error: {str(e)}")

if __name__ == "__main__":
    make_user_id_nullable()