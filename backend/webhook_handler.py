# Create new file: backend/webhook_handler.py
from flask import Blueprint, request, jsonify
import stripe
import json
from config import db, app
from models_db import SubscriptionModel, FacilityModel, UserModel
from email_service import send_payment_confirmation_email, send_email
from datetime import datetime, timedelta

# Change the blueprint name to be unique
webhook_handler_bp = Blueprint('webhook_handler', __name__)

# Update the decorator to use the new name
@webhook_handler_bp.route('/stripe', methods=['POST'])
def stripe_webhook():
    """Handle Stripe webhook events"""
    payload = request.data
    sig_header = request.headers.get('Stripe-Signature')
    
    try:
        # Verify the webhook signature
        event = stripe.Webhook.construct_event(
            payload, sig_header, WEBHOOK_SECRET
        )
    except ValueError as e:
        # Invalid payload
        return jsonify({"message": "Invalid payload"}), 400
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        return jsonify({"message": "Invalid signature"}), 400
    
    # Handle the event
    if event['type'] == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        handle_payment_succeeded(payment_intent)
    
    elif event['type'] == 'payment_intent.payment_failed':
        payment_intent = event['data']['object']
        handle_payment_failed(payment_intent)
    
    elif event['type'] == 'charge.refunded':
        charge = event['data']['object']
        handle_charge_refunded(charge)
    
    elif event['type'] == 'charge.dispute.created':
        dispute = event['data']['object']
        handle_dispute_created(dispute)
    
    # Return a 200 success response
    return jsonify({"message": f"Successfully processed webhook event {event['type']}"}), 200

def handle_payment_succeeded(payment_intent):
    """Handle successful payment"""
    print(f"Payment succeeded: {payment_intent['id']}")
    
    # Look up subscription by payment_id
    subscription = SubscriptionModel.query.filter_by(payment_id=payment_intent['id']).first()
    
    if subscription:
        # Update subscription status if needed
        if not subscription.is_active:
            subscription.is_active = True
            db.session.commit()
        
        # Send confirmation email
        try:
            send_payment_confirmation_email(subscription)
        except Exception as e:
            print(f"Failed to send confirmation email: {str(e)}")

def handle_payment_failed(payment_intent):
    """Handle failed payment"""
    print(f"Payment failed: {payment_intent['id']}")
    
    # If you've already created a subscription entry with this payment ID,
    # you might want to mark it as inactive or delete it
    subscription = SubscriptionModel.query.filter_by(payment_id=payment_intent['id']).first()
    
    if subscription:
        # If you want to keep failed payment records but mark them inactive:
        subscription.is_active = False
        db.session.commit()
        
        # Optionally notify the customer about the failed payment
        try:
            facility = FacilityModel.query.get(subscription.facility_id)
            admin_users = UserModel.query.filter_by(facility_id=facility.id, role='admin').all()
            
            for admin in admin_users:
                if admin.email:
                    subject = "Zebrafish Registry - Payment Failed"
                    html_content = f"""
                    <html>
                      <body>
                        <h2>Payment Failed</h2>
                        <p>Dear {admin.username},</p>
                        <p>We were unable to process your payment for the {subscription.plan_name} subscription plan.</p>
                        <p>Please check your payment details and try again, or contact customer support if you need assistance.</p>
                        <p>Best regards,<br>The Zebrafish Registry Team</p>
                      </body>
                    </html>
                    """
                    send_email(admin.email, subject, html_content)
        except Exception as e:
            print(f"Failed to send payment failure notification: {str(e)}")

def handle_charge_refunded(charge):
    """Handle refund events"""
    print(f"Charge refunded: {charge['id']}")
    payment_intent_id = charge.get('payment_intent')
    
    if payment_intent_id:
        subscription = SubscriptionModel.query.filter_by(payment_id=payment_intent_id).first()
        
        if subscription:
            # You might want to adjust the subscription end date based on the refund amount
            # For simplicity, we'll just mark it as inactive if fully refunded
            if charge['refunded']:  # True if fully refunded
                subscription.is_active = False
                db.session.commit()
                
                # Notify customer about the refund
                try:
                    facility = FacilityModel.query.get(subscription.facility_id)
                    admin_users = UserModel.query.filter_by(facility_id=facility.id, role='admin').all()
                    
                    for admin in admin_users:
                        if admin.email:
                            subject = "Zebrafish Registry - Payment Refunded"
                            html_content = f"""
                            <html>
                              <body>
                                <h2>Payment Refunded</h2>
                                <p>Dear {admin.username},</p>
                                <p>We've processed a refund for your {subscription.plan_name} subscription plan payment.</p>
                                <p>If you did not expect this refund or have any questions, please contact customer support.</p>
                                <p>Best regards,<br>The Zebrafish Registry Team</p>
                              </body>
                            </html>
                            """
                            send_email(admin.email, subject, html_content)
                except Exception as e:
                    print(f"Failed to send refund notification: {str(e)}")

def handle_dispute_created(dispute):
    """Handle payment disputes"""
    print(f"Dispute created: {dispute['id']}")
    payment_intent_id = dispute.get('payment_intent')
    
    if payment_intent_id:
        subscription = SubscriptionModel.query.filter_by(payment_id=payment_intent_id).first()
        
        if subscription:
            # Flag the subscription
            subscription.is_disputed = True
            db.session.commit()
            
            # Alert the system administrators about the dispute
            admin_email = app.config.get('ADMIN_EMAIL', 'admin@example.com')
            subject = "ALERT: Payment Dispute Created"
            html_content = f"""
            <html>
              <body>
                <h2>Payment Dispute Alert</h2>
                <p>A payment dispute has been filed for subscription ID: {subscription.id}</p>
                <p>Facility ID: {subscription.facility_id}</p>
                <p>Payment Intent ID: {payment_intent_id}</p>
                <p>Dispute ID: {dispute['id']}</p>
                <p>Please review this dispute in the Stripe Dashboard immediately.</p>
              </body>
            </html>
            """
            send_email(admin_email, subject, html_content)