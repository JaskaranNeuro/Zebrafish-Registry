# Create a file: backend/set_super_admin.py
from config import app, db
from models_db import UserModel
from sqlalchemy import text

def set_super_admin():
    with app.app_context():
        try:
            # Replace with your username
            your_username = "Jaskaran_Singh"
            
            # First check if the user exists
            user = UserModel.query.filter_by(username=your_username).first()
            if not user:
                print(f"User {your_username} not found")
                return
                
            # Get the user ID
            user_id = user.id
            
            # Execute a direct SQL update
            sql = text("UPDATE users SET is_super_admin = TRUE WHERE id = :user_id")
            db.session.execute(sql, {"user_id": user_id})
            db.session.commit()
            
            print(f"User {your_username} (ID: {user_id}) is now a super admin")
            
            # Verify the change
            result = db.session.execute(text("SELECT is_super_admin FROM users WHERE id = :user_id"), {"user_id": user_id}).fetchone()
            if result and result[0]:
                print("Verification successful: Super admin status set correctly")
            else:
                print("Warning: Verification failed. Super admin status may not have been set correctly.")
                
        except Exception as e:
            db.session.rollback()
            print(f"Error setting super admin: {str(e)}")

if __name__ == "__main__":
    set_super_admin()