from config import db, app
from werkzeug.security import generate_password_hash
from models_db import UserModel, UserRole
from sqlalchemy import text

def check_enum_values_and_create_manager():
    with app.app_context():
        try:
            # First, check what enum values are valid in the database
            with db.engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT enum_range(NULL::userrole)
                """))
                valid_roles = result.scalar()
                print(f"Valid user roles in the database: {valid_roles}")
                
                # If facility_manager is not in the valid roles, we need to add it
                if 'facility_manager' not in str(valid_roles).lower():
                    print("Adding facility_manager to the enum...")
                    try:
                        # Need to modify the enum type with a direct SQL command
                        conn.execute(text("""
                            ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'facility_manager'
                        """))
                        conn.commit()
                        print("Added facility_manager to userrole enum")
                    except Exception as e:
                        print(f"Error adding to enum: {e}")
            
            # Now try to create the user with one of the valid roles
            existing_user = UserModel.query.filter_by(username='facility_manager').first()
            if existing_user:
                print("Facility manager already exists.")
                return
            
            # Create facility manager using the enum string value
            facility_manager = UserModel(
                username='facility_manager',
                email='facility_manager@example.com',
                # Use the same hashing method that's used in your auth system
                password=generate_password_hash('password123'),
                role='facility_manager'  # Make sure this matches what's in the database
            )
            
            db.session.add(facility_manager)
            db.session.commit()
            print("Facility manager created successfully with facility_manager role.")
            
        except Exception as e:
            print(f"Error: {e}")
            db.session.rollback()

if __name__ == "__main__":
    check_enum_values_and_create_manager()