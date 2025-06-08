# Create a file named add_facility_id_to_tables.py

from config import app, db
from sqlalchemy import text, exc

def add_facility_id_to_tables():
    with app.app_context():
        # Check if racks table has facility_id
        try:
            db.session.execute(text("""
                ALTER TABLE racks 
                ADD COLUMN facility_id INTEGER REFERENCES facilities(id)
            """))
            db.session.commit()
            print("Added facility_id to racks table")
        except exc.SQLAlchemyError as e:
            db.session.rollback()
            print(f"Info: {e}")
            print("facility_id column may already exist in racks table")
        
        # Check if breeding_profiles table has facility_id
        try:
            db.session.execute(text("""
                ALTER TABLE breeding_profiles 
                ADD COLUMN facility_id INTEGER REFERENCES facilities(id)
            """))
            db.session.commit()
            print("Added facility_id to breeding_profiles table")
        except exc.SQLAlchemyError as e:
            db.session.rollback()
            print(f"Info: {e}")
            print("facility_id column may already exist in breeding_profiles table")
        
        # Check if clinical_cases table has facility_id
        try:
            db.session.execute(text("""
                ALTER TABLE clinical_cases 
                ADD COLUMN facility_id INTEGER REFERENCES facilities(id)
            """))
            db.session.commit()
            print("Added facility_id to clinical_cases table")
        except exc.SQLAlchemyError as e:
            db.session.rollback()
            print(f"Info: {e}")
            print("facility_id column may already exist in clinical_cases table")
            
        # Update existing data to assign facility_id
        try:
            # Set facility_id=1 for all existing racks without a facility_id
            db.session.execute(text("""
                UPDATE racks SET facility_id = 1 WHERE facility_id IS NULL
            """))
            db.session.commit()
            print("Updated existing racks with default facility_id")
        except exc.SQLAlchemyError as e:
            db.session.rollback()
            print(f"Warning: Error updating existing racks: {e}")
        
        try:
            # Set facility_id=1 for all existing breeding_profiles without a facility_id
            db.session.execute(text("""
                UPDATE breeding_profiles SET facility_id = 1 WHERE facility_id IS NULL
            """))
            db.session.commit()
            print("Updated existing breeding profiles with default facility_id")
        except exc.SQLAlchemyError as e:
            db.session.rollback()
            print(f"Warning: Error updating existing breeding profiles: {e}")
        
        try:
            # Set facility_id=1 for all existing clinical_cases without a facility_id
            db.session.execute(text("""
                UPDATE clinical_cases SET facility_id = 1 WHERE facility_id IS NULL
            """))
            db.session.commit()
            print("Updated existing clinical cases with default facility_id")
        except exc.SQLAlchemyError as e:
            db.session.rollback()
            print(f"Warning: Error updating existing clinical cases: {e}")
        
        print("Database updates completed successfully")

if __name__ == "__main__":
    add_facility_id_to_tables()