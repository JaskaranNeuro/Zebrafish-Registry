from config import app, db
from sqlalchemy import text, exc
from models_db import FacilityModel, BreedingCalendarModel, UserModel
from datetime import datetime

def add_facility_column_to_calendar():
    with app.app_context():
        try:
            # Check if column already exists
            try:
                db.session.execute(text("SELECT facility_id FROM breeding_calendar LIMIT 1"))
                print("facility_id column already exists in breeding_calendar table")
            except exc.SQLAlchemyError:
                # Add facility_id column if it doesn't exist
                db.session.execute(text("""
                    ALTER TABLE breeding_calendar
                    ADD COLUMN facility_id INTEGER REFERENCES facilities(id)
                """))
                db.session.commit()
                print("Added facility_id to breeding_calendar table")
        except exc.SQLAlchemyError as e:
            db.session.rollback()
            print(f"Info: {e}")
            
        # Find default facility for each record based on username
        print("Updating breeding calendar entries with facility IDs...")
        
        # Get all calendar entries without facility_id
        calendar_entries = db.session.execute(text(
            "SELECT id, username FROM breeding_calendar WHERE facility_id IS NULL"
        )).fetchall()
        
        # Get all facilities for reference
        facilities = FacilityModel.query.all()
        facility_ids = [f.id for f in facilities]
        
        if not calendar_entries:
            print("No calendar entries need updating")
            return
            
        print(f"Found {len(calendar_entries)} calendar entries without facility ID")
        
        # Update strategy:
        # 1. Try to match by username
        # 2. If no match, ask which facility to use
        
        updated_count = 0
        for entry in calendar_entries:
            entry_id = entry[0]
            username = entry[1]
            
            # Try to find user with matching username
            user = UserModel.query.filter_by(username=username).first()
            if user and user.facility_id:
                # Update calendar entry with user's facility_id
                db.session.execute(text(
                    f"UPDATE breeding_calendar SET facility_id = {user.facility_id} WHERE id = {entry_id}"
                ))
                updated_count += 1
        
        if updated_count > 0:
            db.session.commit()
            print(f"Updated {updated_count} calendar entries based on username")
        
        # Check if any entries still need updating
        remaining_entries = db.session.execute(text(
            "SELECT COUNT(*) FROM breeding_calendar WHERE facility_id IS NULL"
        )).scalar()
        
        if remaining_entries > 0:
            print(f"{remaining_entries} calendar entries still need a facility ID")
            
            # Ask which facility to use for remaining entries
            print("Available facilities:")
            for i, facility_id in enumerate(facility_ids):
                facility = FacilityModel.query.get(facility_id)
                print(f"{i+1}. {facility.name} (ID: {facility_id})")
                
            choice = input("Choose facility number for remaining entries (or 'q' to quit): ")
            if choice.lower() == 'q':
                print("Operation cancelled")
                return
                
            try:
                facility_id = facility_ids[int(choice)-1]
                
                # Update all remaining entries
                db.session.execute(text(
                    f"UPDATE breeding_calendar SET facility_id = {facility_id} WHERE facility_id IS NULL"
                ))
                db.session.commit()
                print(f"Updated {remaining_entries} calendar entries with facility ID {facility_id}")
                
            except (ValueError, IndexError):
                print("Invalid choice")

if __name__ == "__main__":
    add_facility_column_to_calendar()