from config import db, app
from models_db import UserModel, UserRole
from sqlalchemy import text
import sys

def update_user_roles():
    with app.app_context():
        try:
            # First, check what enum values are valid in the database
            with db.engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT enum_range(NULL::userrole)
                """))
                valid_roles = result.scalar()
                print(f"Valid user roles in the database: {valid_roles}")
                
                # List current users
                users = conn.execute(text("SELECT id, username, role FROM users")).fetchall()
                print("\nCurrent users:")
                for user in users:
                    print(f"ID: {user.id}, Username: {user.username}, Role: {user.role}")
                
                # Update test@example.com to ADMIN
                conn.execute(text("""
                    UPDATE users 
                    SET role = 'ADMIN'::userrole  
                    WHERE username = 'test@example.com';
                """))
                
                # Ensure facility_manager has FACILITY_MANAGER role
                # First check if FACILITY_MANAGER exists as enum value
                if 'FACILITY_MANAGER' in str(valid_roles):
                    conn.execute(text("""
                        UPDATE users 
                        SET role = 'FACILITY_MANAGER'::userrole  
                        WHERE username = 'facility_manager';
                    """))
                else:
                    print("\nWARNING: FACILITY_MANAGER not in valid roles, using 'ADMIN' instead")
                    conn.execute(text("""
                        UPDATE users 
                        SET role = 'ADMIN'::userrole  
                        WHERE username = 'facility_manager';
                    """))
                
                conn.commit()
                
                # Show updated users
                users = conn.execute(text("SELECT id, username, role FROM users")).fetchall()
                print("\nUpdated users:")
                for user in users:
                    print(f"ID: {user.id}, Username: {user.username}, Role: {user.role}")
                
        except Exception as e:
            print(f"Error: {e}")
            db.session.rollback()

if __name__ == "__main__":
    update_user_roles()