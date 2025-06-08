from config import app, db
from models_db import UserModel

def list_all_users():
    with app.app_context():
        try:
            users = UserModel.query.all()
            print(f"Found {len(users)} users in the database:")
            
            for user in users:
                print(f"ID: {user.id}, Username: {user.username}, Email: {user.email}, Role: {user.role}")
                
        except Exception as e:
            print(f"Error listing users: {e}")

if __name__ == "__main__":
    list_all_users()