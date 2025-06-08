from config import app, db
from models_db import UserModel, UserRole
from sqlalchemy import text

def fix_user_roles():
    with app.app_context():
        try:
            # First, check if there are any users with invalid roles
            # Use raw SQL to avoid enum validation errors
            result = db.session.execute(text("SELECT id, username, role FROM users"))
            
            for row in result:
                user_id = row[0]
                username = row[1]
                role = row[2]
                
                print(f"User {username} (ID: {user_id}) has role: {role}")
                
                # If the role is facility_manager but not in enum
                if role == 'facility_manager':
                    print(f"Fixing role for user {username}")
                    # Update directly with SQL to bypass enum validation
                    db.session.execute(
                        text("UPDATE users SET role = 'RESEARCHER' WHERE id = :id"),
                        {"id": user_id}
                    )
            
            db.session.commit()
            print("User roles fixed successfully")
            
        except Exception as e:
            db.session.rollback()
            print(f"Error fixing user roles: {e}")

if __name__ == "__main__":
    fix_user_roles()