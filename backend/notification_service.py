from models_db import db, NotificationModel, UserModel
from email_service import send_email
from datetime import datetime
import threading

def create_notification(facility_id, sender_id, message, category, reference_id=None, exclude_user_ids=None):
    """
    Create notifications for all users in a facility except those in exclude_user_ids
    
    Args:
        facility_id: ID of the facility
        sender_id: ID of the user who triggered the notification
        message: Notification message
        category: Type of notification (e.g., 'case_opened', 'note_added')
        reference_id: Optional ID of the referenced item (e.g., case ID)
        exclude_user_ids: List of user IDs to exclude from notifications
    """
    if exclude_user_ids is None:
        exclude_user_ids = []
    
    if sender_id not in exclude_user_ids:
        exclude_user_ids.append(sender_id)  # Don't notify the sender
        
    try:
        # Find all users in the facility except those excluded
        users_to_notify = UserModel.query.filter_by(facility_id=facility_id).filter(
            ~UserModel.id.in_(exclude_user_ids)
        ).all()
        
        # Create notifications for each user
        for user in users_to_notify:
            notification = NotificationModel(
                user_id=user.id,
                sender_id=sender_id,
                facility_id=facility_id,
                message=message,
                category=category,
                reference_id=reference_id,
                is_read=False,
                created_at=datetime.utcnow()
            )
            db.session.add(notification)
            
            # Also send email notification in separate thread to avoid blocking
            if user.email:
                threading.Thread(
                    target=send_notification_email,
                    args=(user.email, message, category, reference_id)
                ).start()
        
        db.session.commit()
        return True
        
    except Exception as e:
        db.session.rollback()
        print(f"Error creating notifications: {str(e)}")
        return False

def send_notification_email(email, message, category, reference_id=None):
    """Send an email notification to a user"""
    try:
        # Customize subject based on category
        if category == 'case_opened':
            subject = "New Clinical Case Opened"
        elif category == 'note_added':
            subject = "New Note Added to Clinical Case"
        else:
            subject = "Zebrafish Facility Notification"
            
        # Create the email body
        html_content = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }}
                .header {{ text-align: center; padding-bottom: 10px; border-bottom: 2px solid #f0f0f0; margin-bottom: 20px; }}
                .content {{ margin-bottom: 20px; }}
                .footer {{ margin-top: 30px; font-size: 0.9em; color: #777; text-align: center; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>Zebrafish Registry Notification</h2>
                </div>
                <div class="content">
                    <p>{message}</p>
                    <p>Please log in to your Zebrafish Registry account to view details.</p>
                </div>
                <div class="footer">
                    <p>This is an automated notification. Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Send the email
        send_email(email, subject, html_content)
        print(f"Notification email sent to {email}")
        
    except Exception as e:
        print(f"Error sending notification email: {str(e)}")

def get_user_notifications(user_id, limit=10, offset=0, unread_only=False):
    """Get notifications for a specific user"""
    query = NotificationModel.query.filter_by(user_id=user_id)
    
    if unread_only:
        query = query.filter_by(is_read=False)
        
    return query.order_by(NotificationModel.created_at.desc()).limit(limit).offset(offset).all()

def mark_notification_as_read(notification_id, user_id):
    """Mark a specific notification as read"""
    notification = NotificationModel.query.filter_by(
        id=notification_id, user_id=user_id
    ).first()
    
    if notification:
        notification.is_read = True
        db.session.commit()
        return True
    return False

def mark_all_as_read(user_id):
    """Mark all notifications for a user as read"""
    NotificationModel.query.filter_by(user_id=user_id, is_read=False).update({'is_read': True})
    db.session.commit()
    return True