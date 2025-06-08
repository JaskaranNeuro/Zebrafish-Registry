from config import app, db
from models_db import UserModel, SubscriptionModel
from sqlalchemy import text

def transfer_subscription_and_delete_user():
    with app.app_context():
        # Let's verify the subscription and user relationships
        print("Current subscriptions:")
        subscriptions = SubscriptionModel.query.all()
        for sub in subscriptions:
            print(f"Subscription ID: {sub.id}, User ID: {sub.user_id}, Facility ID: {sub.facility_id}")
        
        # Get source user (jaskaran1911)
        source_user_id = 10  # jaskaran1911
        source_user = UserModel.query.get(source_user_id)
        if not source_user:
            print(f"Source user with ID {source_user_id} not found")
            return
        
        print(f"Source user: {source_user.username} (ID: {source_user.id})")
        
        # Get target user (Jaskaran_Singh)
        target_username = "Jaskaran_Singh"
        target_user = UserModel.query.filter_by(username=target_username).first()
        if not target_user:
            print(f"Target user {target_username} not found")
            return
        
        print(f"Target user: {target_user.username} (ID: {target_user.id})")
        
        # Use direct SQL to update the subscription
        try:
            print(f"Updating subscription from user {source_user.id} to {target_user.id}...")
            result = db.session.execute(text(
                f"UPDATE subscriptions SET user_id = {target_user.id} WHERE user_id = {source_user.id}"
            ))
            db.session.commit()
            print(f"Updated {result.rowcount} subscription records")
            
            # Verify the change
            updated_subs = SubscriptionModel.query.filter_by(user_id=target_user.id).all()
            print(f"Target user now has {len(updated_subs)} subscriptions")
            
            # Delete the source user using direct SQL
            print(f"Deleting user {source_user.username}...")
            user_delete_result = db.session.execute(text(
                f"DELETE FROM users WHERE id = {source_user.id}"
            ))
            db.session.commit()
            print(f"Deleted user: {user_delete_result.rowcount} row(s) affected")
            
            print("Operation completed successfully")
            
        except Exception as e:
            db.session.rollback()
            print(f"Error: {str(e)}")
        
        # Final verification
        print("\nFinal subscription state:")
        final_subs = SubscriptionModel.query.all()
        for sub in final_subs:
            print(f"Subscription ID: {sub.id}, User ID: {sub.user_id}, Facility ID: {sub.facility_id}")

if __name__ == "__main__":
    transfer_subscription_and_delete_user()