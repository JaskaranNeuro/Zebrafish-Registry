# fix_admin_permissions.py
from config import app, db
from models_db import UserModel, UserRole
from sqlalchemy import text

def fix_admin_permissions():
    with app.app_context():
        # Get user by username
        username = input("Enter username to fix: ")
        user = UserModel.query.filter_by(username=username).first()
        
        if not user:
            print(f"User {username} not found")
            return
            
        print(f"Found user {user.username} (ID: {user.id})")
        print(f"Current role: {user.role}")
        
        # Ensure user has the proper admin role
        user.role = UserRole.ADMIN
        
        # Force the role directly with SQL to ensure it's properly set
        try:
            db.session.execute(text(f"""
                UPDATE users SET role = 'ADMIN'::userrole WHERE id = {user.id}
            """))
            db.session.commit()
            print(f"Updated {user.username} to have ADMIN role")
            
            # Verify the change
            db.session.refresh(user)
            print(f"New role: {user.role}")
            
        except Exception as e:
            db.session.rollback()
            print(f"Error updating role: {e}")

if __name__ == "__main__":
    fix_admin_permissions()