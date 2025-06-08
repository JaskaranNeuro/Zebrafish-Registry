from config import app, db
from models_db import SubscriptionModel

def fix_subscription_data():
    with app.app_context():
        try:
            print("Checking for inconsistent subscription data...")
            # Find subscriptions with only partial tier data
            subscriptions = SubscriptionModel.query.filter(
                ((SubscriptionModel.original_plan_name == None) & (SubscriptionModel.original_plan_end_date != None)) |
                ((SubscriptionModel.original_plan_name != None) & (SubscriptionModel.original_plan_end_date == None))
            ).all()
            
            count = 0
            for subscription in subscriptions:
                print(f"Fixing subscription ID: {subscription.id}")
                
                # If either field is missing, reset both to ensure consistency
                if not subscription.original_plan_name or not subscription.original_plan_end_date:
                    subscription.original_plan_name = None
                    subscription.original_plan_end_date = None
                    count += 1
            
            if count > 0:
                db.session.commit()
                print(f"Fixed {count} subscriptions")
            else:
                print("No inconsistent subscriptions found")
            
        except Exception as e:
            db.session.rollback()
            print(f"Error fixing subscription data: {str(e)}")

if __name__ == "__main__":
    fix_subscription_data()