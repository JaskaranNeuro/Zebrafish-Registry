from config import app, db
from models_db import UserModel, UserRole
from werkzeug.security import generate_password_hash

def reset_admin_password():
    with app.app_context():
        try:
            # Find an existing admin user
            admin = UserModel.query.filter_by(role=UserRole.ADMIN).first()
            
            if admin:
                # Reset password
                admin.password = generate_password_hash('admin123')
                db.session.commit()
                
                print(f"Reset password for admin user: {admin.username}")
                print("New password: admin123")
            else:
                # Try to find admin2 or any other user
                user = UserModel.query.filter_by(username='admin2').first()
                
                if user:
                    # Make them admin and reset password
                    user.password = generate_password_hash('admin123')
                    user.role = UserRole.ADMIN
                    db.session.commit()
                    
                    print(f"Updated user {user.username} to admin role")
                    print("New password: admin123")
                else:
                    print("No admin or 'admin2' user found")
                    
                    # Get first user and make them admin
                    any_user = UserModel.query.first()
                    if any_user:
                        any_user.role = UserRole.ADMIN
                        any_user.password = generate_password_hash('admin123')
                        db.session.commit()
                        
                        print(f"Made user {any_user.username} an admin")
                        print("New password: admin123")
                    else:
                        print("No users found in the database")
        
        except Exception as e:
            db.session.rollback()
            print(f"Error resetting password: {e}")

if __name__ == "__main__":
    reset_admin_password()