from config import app, db
from models_db import UserModel
import inspect

def check_user_model():
    with app.app_context():
        # Check if UserModel has is_super_admin attribute
        print("Checking UserModel class structure:")
        
        # Get all attributes of the UserModel class
        attributes = [attr for attr in dir(UserModel) if not attr.startswith('__')]
        print(f"UserModel attributes: {', '.join(attributes)}")
        
        # Print model mapping
        print("\nUserModel table mapping:")
        if hasattr(UserModel, '__table__'):
            table = UserModel.__table__
            print(f"Table name: {table.name}")
            print("Columns:")
            for column in table.columns:
                print(f"  - {column.name}: {column.type}")
        else:
            print("No __table__ attribute found")
            
        # Check if we can fetch a user
        user = UserModel.query.first()
        if user:
            print(f"\nSample user data: {user.username} (ID: {user.id})")
            user_dict = {c.name: getattr(user, c.name) for c in user.__table__.columns}
            print(f"User attributes: {user_dict}")
        else:
            print("\nNo users found in database")

if __name__ == "__main__":
    check_user_model()