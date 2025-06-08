# Create file: backend/fix_subscription_sequential_tiers.py

from config import app, db
from models_db import SubscriptionModel, SubscriptionTierModel
from datetime import datetime, timedelta

def fix_subscription_sequential_tiers():
    with app.app_context():
        try:
            print("Fixing subscription sequential tiers...")
            
            # Get all subscriptions
            subscriptions = SubscriptionModel.query.all()
            
            for subscription in subscriptions:
                print(f"Processing subscription {subscription.id} for facility {subscription.facility_id}")
                
                # Get all tiers for this subscription
                tiers = SubscriptionTierModel.query.filter_by(
                    subscription_id=subscription.id
                ).order_by(SubscriptionTierModel.id).all()
                
                if len(tiers) <= 1:
                    print(f"  Skipping subscription {subscription.id} - no multiple tiers found")
                    continue
                
                # Sort tiers by creation date (oldest first)
                tiers.sort(key=lambda t: t.id)
                
                # Calculate sequential dates
                print(f"  Found {len(tiers)} tiers, fixing dates...")
                
                # Start with the subscription end date
                start_date = subscription.end_date
                
                # Process each tier (except possibly the first one that's in use)
                for i, tier in enumerate(tiers):
                    # Set this tier to start after the previous one
                    if i == 0 and datetime.utcnow() < subscription.end_date:
                        # For the first tier, it starts after the current subscription ends
                        tier.start_date = subscription.end_date
                    elif i > 0:
                        # For subsequent tiers, start after the previous tier
                        tier.start_date = tiers[i-1].end_date
                    
                    # Calculate the duration (days) for this tier
                    days = 10  # Default to 10 days if we can't determine
                    if tier.end_date and tier.start_date and tier.end_date > tier.start_date:
                        delta = tier.end_date - tier.start_date
                        days = delta.days
                    
                    # Set the end date based on the new start date
                    tier.end_date = tier.start_date + timedelta(days=days)
                    print(f"    Tier {i+1}: {tier.plan_name} - {tier.start_date.date()} to {tier.end_date.date()} ({days} days)")
                
                # Update the subscription end date to the last tier's end date
                if tiers:
                    last_tier = tiers[-1]
                    subscription.end_date = last_tier.end_date
                    print(f"  Updated subscription end date to {subscription.end_date.date()}")
                
                # Commit changes
                db.session.commit()
                print(f"  Successfully fixed subscription {subscription.id}")
            
            print("Fixing subscription sequential tiers complete")
        
        except Exception as e:
            db.session.rollback()
            print(f"Error fixing tiers: {str(e)}")

if __name__ == "__main__":
    fix_subscription_sequential_tiers()