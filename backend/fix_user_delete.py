from config import app, db
from models_db import UserModel, SubscriptionModel

def delete_user_with_subscriptions(user_id):
    with app.app_context():
        # Find the user
        user = UserModel.query.get(user_id)
        if not user:
            print(f"User with ID {user_id} not found")
            return
            
        print(f"Found user {user.username} (ID: {user.id})")
            
        # Find subscriptions
        subscriptions = SubscriptionModel.query.filter_by(user_id=user_id).all()
        print(f"Found {len(subscriptions)} subscription records")
        
        # Delete subscriptions
        for subscription in subscriptions:
            print(f"Deleting subscription ID: {subscription.id}")
            db.session.delete(subscription)
        
        # Now delete the user
        db.session.delete(user)
        db.session.commit()
        print(f"Successfully deleted user {user.username} (ID: {user_id}) and {len(subscriptions)} subscription records")

if __name__ == "__main__":
    user_id = input("Enter the user ID to delete: ")
    if user_id:
        delete_user_with_subscriptions(int(user_id))