# Create file: backend/fix_subscription_priority.py

from config import app, db
from models_db import SubscriptionModel, SubscriptionTierModel
from datetime import datetime, timedelta

def get_plan_priority(plan_name):
    """Return the priority of a plan (higher number means higher priority)"""
    plan_priorities = {
        "TRIAL": 0,
        "BASIC": 1,
        "STANDARD": 2, 
        "PREMIUM": 3
    }
    return plan_priorities.get(plan_name, 0)

def fix_subscription_priority():
    with app.app_context():
        try:
            print("Fixing subscription priority order...")
            
            # Get all subscriptions
            subscriptions = SubscriptionModel.query.all()
            
            for subscription in subscriptions:
                print(f"Processing subscription {subscription.id} for facility {subscription.facility_id}")
                
                # Get all tiers for this subscription
                tiers = SubscriptionTierModel.query.filter_by(
                    subscription_id=subscription.id
                ).all()
                
                if not tiers:
                    print(f"  Skipping subscription {subscription.id} - no tiers found")
                    continue
                
                # Create a list of all plans including the current one
                all_plans = [{
                    "plan_name": subscription.plan_name,
                    "days": (subscription.end_date - datetime.utcnow()).days if subscription.end_date > datetime.utcnow() else 0,
                    "is_current": True
                }]
                
                for tier in tiers:
                    tier_days = (tier.end_date - tier.start_date).days if tier.end_date and tier.start_date else 0
                    all_plans.append({
                        "plan_name": tier.plan_name,
                        "days": tier_days,
                        "is_current": False
                    })
                
                # Sort by plan priority (highest first)
                all_plans.sort(key=lambda p: get_plan_priority(p["plan_name"]), reverse=True)
                
                print(f"  New priority order:")
                for i, plan in enumerate(all_plans):
                    print(f"    {i+1}. {plan['plan_name']} - {plan['days']} days")
                
                # Always use the highest priority plan as the current subscription
                if all_plans and all_plans[0]["plan_name"] != subscription.plan_name:
                    print(f"  Changing main subscription from {subscription.plan_name} to {all_plans[0]['plan_name']}")
                    
                    # Delete all existing tiers
                    for tier in tiers:
                        db.session.delete(tier)
                    
                    # Update the main subscription to the highest priority plan
                    subscription.plan_name = all_plans[0]["plan_name"]
                    
                    # Create tiers for the remaining plans
                    current_date = datetime.utcnow() + timedelta(days=all_plans[0]["days"])
                    
                    for i, plan in enumerate(all_plans[1:], 1):
                        new_tier = SubscriptionTierModel(
                            subscription_id=subscription.id,
                            plan_name=plan["plan_name"],
                            start_date=current_date,
                            end_date=current_date + timedelta(days=plan["days"]),
                            tier_order=i
                        )
                        db.session.add(new_tier)
                        current_date = new_tier.end_date
                    
                    # Update the subscription end date
                    subscription.end_date = current_date
                
                db.session.commit()
                print(f"  Successfully updated subscription {subscription.id}")
            
            print("Fixing subscription priority complete")
        
        except Exception as e:
            db.session.rollback()
            print(f"Error fixing subscription priority: {str(e)}")

if __name__ == "__main__":
    fix_subscription_priority()