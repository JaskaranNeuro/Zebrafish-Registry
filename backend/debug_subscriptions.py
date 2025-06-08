from config import app, db
from models_db import UserModel, SubscriptionModel, FacilityModel
from sqlalchemy import text, inspect

def show_table_relationships():
    with app.app_context():
        # Get the inspector
        inspector = inspect(db.engine)
        
        # Look at foreign keys in subscriptions table
        print("Subscriptions table foreign keys:")
        for fk in inspector.get_foreign_keys('subscriptions'):
            print(f"  Column: {fk['constrained_columns']}")
            print(f"  References: {fk['referred_table']}.{fk['referred_columns']}")
            print(f"  Name: {fk.get('name')}")
            print(f"  Options: {fk.get('options', {})}")
            print()

def direct_sql_operations():
    with app.app_context():
        try:
            # Find the problematic subscription
            sub = db.session.execute(text("SELECT * FROM subscriptions WHERE user_id = 10")).fetchone()
            if sub:
                print(f"Found subscription: {sub}")
                
                # Try direct SQL update
                db.session.execute(text("UPDATE subscriptions SET user_id = 7 WHERE user_id = 10"))
                db.session.commit()
                print("Updated subscription to user ID 7")
                
                # Try direct user deletion
                db.session.execute(text("DELETE FROM users WHERE id = 10"))
                db.session.commit()
                print("Deleted user ID 10")
            else:
                print("No subscription found with user_id = 10")
        except Exception as e:
            db.session.rollback()
            print(f"Error: {str(e)}")

def cleanup_orphaned_subscriptions():
    with app.app_context():
        try:
            # Find subscriptions with non-existent users
            query = """
            SELECT s.id, s.user_id, s.facility_id 
            FROM subscriptions s 
            LEFT JOIN users u ON s.user_id = u.id 
            WHERE u.id IS NULL
            """
            orphaned = db.session.execute(text(query)).fetchall()
            
            if orphaned:
                print(f"Found {len(orphaned)} orphaned subscriptions:")
                for sub in orphaned:
                    print(f"  Subscription ID: {sub.id}, User ID: {sub.user_id}, Facility ID: {sub.facility_id}")
                
                # Delete orphaned subscriptions
                if input("Delete these orphaned subscriptions? (y/n): ").lower() == 'y':
                    for sub in orphaned:
                        db.session.execute(text(f"DELETE FROM subscriptions WHERE id = {sub.id}"))
                    db.session.commit()
                    print("Deleted orphaned subscriptions")
            else:
                print("No orphaned subscriptions found")
                
        except Exception as e:
            db.session.rollback()
            print(f"Error: {str(e)}")

if __name__ == "__main__":
    print("1. Show table relationships")
    print("2. Try direct SQL operations")
    print("3. Clean up orphaned subscriptions")
    choice = input("Choose an option (1/2/3): ")
    
    if choice == "1":
        show_table_relationships()
    elif choice == "2":
        direct_sql_operations()
    elif choice == "3":
        cleanup_orphaned_subscriptions()
    else:
        print("Invalid choice")