from config import db, app
from sqlalchemy import text

def fix_enum():
    with app.app_context():
        try:
            with db.engine.connect() as conn:
                # First, check what are all the valid enum values
                enum_result = conn.execute(text("""
                    SELECT enum_range(NULL::userrole)
                """)).scalar()
                print(f"Valid role values in database: {enum_result}")
                
                # Drop the existing role column constraint 
                conn.execute(text("""
                    ALTER TABLE users 
                    DROP CONSTRAINT IF EXISTS users_role_check;
                """))
                
                # Alter the enum type to add FACILITY_MANAGER
                try:
                    conn.execute(text("""
                        ALTER TYPE userrole ADD VALUE 'FACILITY_MANAGER';
                    """))
                    print("Added FACILITY_MANAGER to userrole enum")
                except Exception as e:
                    print(f"Could not add to enum (might already exist): {e}")
                
                # Now run the query to see what users exist and their roles
                result = conn.execute(text("""
                    SELECT id, username, role FROM users;
                """)).fetchall()
                
                for row in result:
                    print(f"User: {row.username}, Role: {row.role}")
                
                # Now update the facility_manager user's role
                conn.execute(text("""
                    UPDATE users 
                    SET role = 'RESEARCHER'::userrole  
                    WHERE username = 'facility_manager';
                """))
                
                print("Updated facility_manager user to have RESEARCHER role")
                
                conn.commit()
                print("Fixed the user roles in database")
                
        except Exception as e:
            print(f"Error fixing enum: {e}")
            db.session.rollback()

if __name__ == "__main__":
    fix_enum()