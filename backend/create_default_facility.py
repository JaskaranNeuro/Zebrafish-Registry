from config import app, db
from sqlalchemy import text, exc
from models_db import FacilityModel, UserModel

def create_default_facility():
    with app.app_context():
        try:
            # Check if any facility exists
            facility = FacilityModel.query.first()
            
            if not facility:
                print("No facility found. Creating a default facility...")
                # Create a default facility
                default_facility = FacilityModel(
                    name="Default Facility",
                    organization_name="Default Organization"
                )
                db.session.add(default_facility)
                db.session.commit()
                print(f"Created default facility with ID: {default_facility.id}")
                
                # Find existing admin user
                admin_user = UserModel.query.filter_by(role='ADMIN').first()
                if admin_user:
                    # Link admin user to the facility
                    admin_user.facility_id = default_facility.id
                    db.session.commit()
                    print(f"Linked admin user {admin_user.username} to default facility")
                
                # Update all racks to use the new facility
                try:
                    db.session.execute(text(f"""
                        UPDATE racks SET facility_id = {default_facility.id} WHERE facility_id IS NULL
                    """))
                    db.session.commit()
                    print("Updated racks with default facility_id")
                except exc.SQLAlchemyError as e:
                    db.session.rollback()
                    print(f"Warning: Error updating racks: {e}")
                
                # Update all breeding_profiles to use the new facility
                try:
                    db.session.execute(text(f"""
                        UPDATE breeding_profiles SET facility_id = {default_facility.id} WHERE facility_id IS NULL
                    """))
                    db.session.commit()
                    print("Updated breeding profiles with default facility_id")
                except exc.SQLAlchemyError as e:
                    db.session.rollback()
                    print(f"Warning: Error updating breeding profiles: {e}")
                
                # Update all clinical_cases to use the new facility
                try:
                    db.session.execute(text(f"""
                        UPDATE clinical_cases SET facility_id = {default_facility.id} WHERE facility_id IS NULL
                    """))
                    db.session.commit()
                    print("Updated clinical cases with default facility_id")
                except exc.SQLAlchemyError as e:
                    db.session.rollback()
                    print(f"Warning: Error updating clinical cases: {e}")
                
                return default_facility.id
            else:
                print(f"Existing facility found with ID: {facility.id}")
                return facility.id
                
        except Exception as e:
            db.session.rollback()
            print(f"Error creating default facility: {e}")
            return None

def check_facility_links():
    with app.app_context():
        try:
            # Count tables with NULL facility_id
            racks_count = db.session.execute(text("SELECT COUNT(*) FROM racks WHERE facility_id IS NULL")).scalar()
            profiles_count = db.session.execute(text("SELECT COUNT(*) FROM breeding_profiles WHERE facility_id IS NULL")).scalar()
            cases_count = db.session.execute(text("SELECT COUNT(*) FROM clinical_cases WHERE facility_id IS NULL")).scalar()
            
            print(f"Racks with NULL facility_id: {racks_count}")
            print(f"Breeding profiles with NULL facility_id: {profiles_count}")
            print(f"Clinical cases with NULL facility_id: {cases_count}")
            
            # Check user facility links
            users = UserModel.query.all()
            linked_users = 0
            unlinked_users = 0
            
            for user in users:
                if user.facility_id:
                    linked_users += 1
                else:
                    unlinked_users += 1
                    
            print(f"Users with facility link: {linked_users}")
            print(f"Users without facility link: {unlinked_users}")
            
            if unlinked_users > 0:
                # Get the default facility
                facility = FacilityModel.query.first()
                if facility:
                    # Update users without facility_id
                    try:
                        db.session.execute(text(f"""
                            UPDATE users SET facility_id = {facility.id} WHERE facility_id IS NULL
                        """))
                        db.session.commit()
                        print(f"Updated {unlinked_users} users with default facility_id")
                    except exc.SQLAlchemyError as e:
                        db.session.rollback()
                        print(f"Warning: Error updating users: {e}")
                        
        except Exception as e:
            print(f"Error checking facility links: {e}")

if __name__ == "__main__":
    facility_id = create_default_facility()
    if facility_id:
        print(f"Using facility ID: {facility_id}")
        check_facility_links()
    else:
        print("Failed to create or find a facility")