# Create file: backend/fix_subscription_tiers.py

from config import app, db
from models_db import SubscriptionModel, SubscriptionTierModel
from datetime import datetime, timedelta

def fix_subscription_tiers():
    with app.app_context():
        try:
            print("Fixing subscription tiers...")
            # Find all subscriptions with original_plan_name and original_plan_end_date
            subscriptions = SubscriptionModel.query.filter(
                SubscriptionModel.original_plan_name.isnot(None),
                SubscriptionModel.original_plan_end_date.isnot(None)
            ).all()
            
            count = 0
            for subscription in subscriptions:
                # Check for existing tiers
                existing_tiers = SubscriptionTierModel.query.filter_by(
                    subscription_id=subscription.id
                ).all()
                
                # If no tiers exist yet, create one for the original plan
                if not existing_tiers and subscription.original_plan_end_date > subscription.end_date:
                    tier = SubscriptionTierModel(
                        subscription_id=subscription.id,
                        plan_name=subscription.original_plan_name,
                        start_date=subscription.end_date,  # Start after current plan ends
                        end_date=subscription.original_plan_end_date,
                        tier_order=1
                    )
                    db.session.add(tier)
                    count += 1
            
            db.session.commit()
            print(f"Fixed {count} subscription tiers")
            
            # Fix zero-day tiers
            zero_day_tiers = SubscriptionTierModel.query.filter(
                SubscriptionTierModel.start_date == SubscriptionTierModel.end_date
            ).all()
            
            for tier in zero_day_tiers:
                print(f"Fixing zero-day tier ID {tier.id} for subscription {tier.subscription_id}")
                tier.end_date = tier.start_date + timedelta(days=10)  # Add 10 days
            
            if zero_day_tiers:
                db.session.commit()
                print(f"Fixed {len(zero_day_tiers)} zero-day tiers")
            
            # Enhanced fix for zero-day tiers with sequential dates
            subscriptions = SubscriptionModel.query.all()
            for subscription in subscriptions:
                tiers = SubscriptionTierModel.query.filter_by(
                    subscription_id=subscription.id
                ).order_by(SubscriptionTierModel.tier_order).all()
                
                if len(tiers) <= 1:  # Skip if there's only one tier or no tiers
                    continue
                    
                print(f"Processing subscription {subscription.id} with {len(tiers)} tiers")
                
                # Start with the current plan end date
                next_start = subscription.end_date
                
                # Process each tier to ensure they stack sequentially
                for tier in tiers:
                    # Set this tier's start date to the next available date
                    tier.start_date = next_start
                    
                    # Calculate the duration in days (if it's a zero-day tier, give it 10 days)
                    if tier.start_date == tier.end_date:
                        tier.end_date = tier.start_date + timedelta(days=10)
                        print(f"  Fixed zero-day tier ID {tier.id}, added 10 days")
                    
                    # Set the next start date to this tier's end date
                    next_start = tier.end_date
                
                # After fixing all tiers, update the subscription's original_plan fields if needed
                if tiers and subscription.original_plan_name:
                    # The last tier should be the original plan
                    last_tier = tiers[-1]
                    subscription.original_plan_end_date = last_tier.end_date
                
                db.session.commit()
                print(f"Fixed tier sequence for subscription {subscription.id}")
            
        except Exception as e:
            db.session.rollback()
            print(f"Error fixing subscription tiers: {str(e)}")

if __name__ == "__main__":
    fix_subscription_tiers()