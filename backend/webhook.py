# Create file: backend/webhook.py

from flask import Blueprint, request, jsonify
from config import app, db
from models_db import SubscriptionModel
import stripe
import json
from datetime import datetime, timedelta

# Change the blueprint name to be unique
webhook_bp = Blueprint('webhook', __name__)

# This is your Stripe CLI webhook secret for testing your endpoint locally
WEBHOOK_SECRET = "whsec_your_webhook_secret_here"  # Replace with your Stripe webhook secret

@webhook_bp.route('/stripe', methods=['POST'])
def stripe_webhook():
    payload = request.data
    sig_header = request.headers.get('Stripe-Signature')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, WEBHOOK_SECRET
        )
    except ValueError as e:
        # Invalid payload
        print(f"Invalid payload: {str(e)}")
        return jsonify({"message": "Invalid payload"}), 400
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        print(f"Invalid signature: {str(e)}")
        return jsonify({"message": "Invalid signature"}), 400
    
    # Handle the event
    if event['type'] == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        handle_payment_succeeded(payment_intent)
    elif event['type'] == 'payment_intent.payment_failed':
        payment_intent = event['data']['object']
        handle_payment_failed(payment_intent)
    # Add more event types as needed
    
    return jsonify({"status": "success"})

def handle_payment_succeeded(payment_intent):
    """Handle successful payment webhook event"""
    try:
        payment_id = payment_intent['id']
        metadata = payment_intent.get('metadata', {})
        
        # Check if this payment has already been processed
        subscription = SubscriptionModel.query.filter_by(payment_id=payment_id).first()
        if subscription:
            # Already processed, nothing more to do
            print(f"Payment {payment_id} already processed")
            return
            
        # Get metadata from payment intent
        facility_id = metadata.get('facility_id')
        plan = metadata.get('plan', 'BASIC')
        days = int(metadata.get('days', 30))
        
        if facility_id:
            subscription = SubscriptionModel.query.filter_by(facility_id=facility_id).first()
            
            if subscription:
                # Update existing subscription
                if subscription.end_date > datetime.utcnow():
                    subscription.end_date += timedelta(days=days)
                else:
                    subscription.start_date = datetime.utcnow()
                    subscription.end_date = datetime.utcnow() + timedelta(days=days)
                    
                subscription.plan_name = plan
                subscription.is_active = True
                subscription.payment_id = payment_id
            else:
                # Create new subscription
                from subscription import get_plan_limits
                
                subscription = SubscriptionModel(
                    facility_id=facility_id,
                    user_id=metadata.get('user_id'),
                    plan_name=plan,
                    start_date=datetime.utcnow(),
                    end_date=datetime.utcnow() + timedelta(days=days),
                    max_users=get_plan_limits(plan)["max_users"],
                    max_racks=get_plan_limits(plan)["max_racks"],
                    is_active=True,
                    payment_id=payment_id
                )
                db.session.add(subscription)
                
            db.session.commit()
            print(f"Webhook: Successfully processed payment {payment_id}")
            
    except Exception as e:
        print(f"Error processing payment success webhook: {str(e)}")
        db.session.rollback()

def handle_payment_failed(payment_intent):
    """Handle failed payment webhook event"""
    try:
        payment_id = payment_intent['id']
        last_payment_error = payment_intent.get('last_payment_error', {})
        error_message = last_payment_error.get('message', 'No error details available')
        
        print(f"Payment {payment_id} failed: {error_message}")
        # You could add code here to notify administrators or log the error
        
    except Exception as e:
        print(f"Error processing payment failure webhook: {str(e)}")