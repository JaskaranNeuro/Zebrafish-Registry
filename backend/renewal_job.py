from datetime import datetime, timedelta, timezone
from config import app, db
from models_db import SubscriptionModel
import stripe
from subscription import ensure_timezone_aware, handle_successful_payment, get_period_days
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("auto-renewal")

# In both files, replace lines containing Stripe API keys with:
import os
stripe.api_key = os.environ.get('STRIPE_API_KEY', '')

def process_renewals():
    """Check for subscriptions that need renewal and process them"""
    with app.app_context():
        try:
            # Find subscriptions that expire within the next 24 hours and have auto-renewal enabled
            tomorrow = ensure_timezone_aware(datetime.now() + timedelta(hours=24))
            
            # Find subscriptions expiring soon with auto-renewal enabled
            expiring_subscriptions = SubscriptionModel.query.filter(
                SubscriptionModel.is_active == True,
                SubscriptionModel.end_date <= tomorrow,
                SubscriptionModel.auto_renew == True,
                SubscriptionModel.payment_method_id != None
            ).all()
            
            logger.info(f"Found {len(expiring_subscriptions)} subscriptions for auto-renewal")
            
            for subscription in expiring_subscriptions:
                try:
                    # Create a new payment intent using the stored payment method
                    logger.info(f"Processing renewal for subscription {subscription.id}")
                    
                    days = get_period_days(subscription.renewal_period)
                    price_per_day = {
                        "TRIAL": 0,
                        "BASIC": 1.00,
                        "STANDARD": 2.50,
                        "PREMIUM": 5.00,
                        "UNLIMITED": 10.00
                    }.get(subscription.plan_name, 1.00)
                    
                    # Calculate amount with period discount
                    discount = {
                        "1_month": 0,
                        "3_months": 0.05,
                        "6_months": 0.10,
                        "1_year": 0.15
                    }.get(subscription.renewal_period, 0)
                    
                    base_amount = price_per_day * days
                    discounted_amount = base_amount * (1 - discount)
                    amount = int(discounted_amount * 100)  # Amount in cents
                    
                    # Create payment intent with the saved payment method
                    payment_intent = stripe.PaymentIntent.create(
                        amount=amount,
                        currency='usd',
                        payment_method=subscription.payment_method_id,
                        customer=subscription.user_id,  # Use user_id as customer ID
                        confirm=True,
                        off_session=True,  # Important for saved payment methods
                        metadata={
                            "facility_id": subscription.facility_id,
                            "user_id": subscription.user_id,
                            "auto_renewal": "true"
                        }
                    )
                    
                    # If payment succeeds, extend the subscription
                    if payment_intent.status == 'succeeded':
                        handle_successful_payment(
                            payment_id=payment_intent.id,
                            facility_id=subscription.facility_id,
                            user_id=subscription.user_id,
                            plan=subscription.plan_name,
                            days=days
                        )
                        logger.info(f"Successfully renewed subscription {subscription.id}")
                        
                        # You could send email notification here
                        
                except Exception as e:
                    logger.error(f"Error processing renewal for subscription {subscription.id}: {str(e)}")
                    # Disable auto-renewal after failed attempt
                    subscription.auto_renew = False
                    db.session.commit()
        
        except Exception as e:
            logger.error(f"Error in renewal job: {str(e)}")

if __name__ == "__main__":
    process_renewals()