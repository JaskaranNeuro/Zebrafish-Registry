from config import app, db
from sqlalchemy import text

def add_facility_id_column():
    with app.app_context():
        try:
            # Add the facility_id column to the users table
            db.session.execute(text("""
                ALTER TABLE users 
                ADD COLUMN facility_id INTEGER REFERENCES facilities(id)
            """))
            
            # Also add created_by column if it's missing
            try:
                db.session.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN created_by INTEGER REFERENCES users(id)
                """))
                print("Added created_by column to users table")
            except Exception as e:
                print(f"Note: created_by column may already exist: {e}")
                
            db.session.commit()
            print("Added facility_id column to users table successfully")
        except Exception as e:
            db.session.rollback()
            print(f"Error adding facility_id column: {e}")

if __name__ == "__main__":
    add_facility_id_column()