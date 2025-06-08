# Create new file: backend/email_service.py
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime
from config import app

# Configure email settings
SMTP_SERVER = app.config.get('SMTP_SERVER', 'smtp.gmail.com')
SMTP_PORT = app.config.get('SMTP_PORT', 587)
SMTP_USERNAME = app.config.get('SMTP_USERNAME', 'your-email@gmail.com')
SMTP_PASSWORD = app.config.get('SMTP_PASSWORD', 'your-app-password')
EMAIL_FROM = app.config.get('EMAIL_FROM', 'Zebrafish Registry <your-email@gmail.com>')

def send_email(to_email, subject, html_content):
    """Send an HTML email"""
    try:
        # Create message container
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = EMAIL_FROM
        msg['To'] = to_email
        
        # Create HTML content
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        # Send the email
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.ehlo()
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.sendmail(EMAIL_FROM, to_email, msg.as_string())
        server.close()
        
        print(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        print(f"Failed to send email: {str(e)}")
        return False

def send_payment_confirmation_email(user_email, plan_name, days, amount, end_date):
    """Send a payment confirmation email to the user with detailed receipt"""
    try:
        # Email server settings from config
        smtp_server = app.config.get('SMTP_SERVER', 'smtp.gmail.com')
        smtp_port = app.config.get('SMTP_PORT', 587)
        smtp_username = app.config.get('SMTP_USERNAME')
        smtp_password = app.config.get('SMTP_PASSWORD')
        
        # If email credentials are not configured, log and return
        if not smtp_username or not smtp_password:
            print("Email credentials not configured. Skipping confirmation email.")
            return
        
        # Format dates nicely
        end_date_str = end_date.strftime('%B %d, %Y') if isinstance(end_date, datetime) else str(end_date)
        current_date = datetime.utcnow()
        
        # Calculate plan period
        period_text = ""
        if days <= 30:
            period_text = "1 month"
        elif days <= 90:
            period_text = "3 months"
        elif days <= 180:
            period_text = "6 months" 
        else:
            period_text = "1 year"
        
        # Create message
        message = MIMEMultipart()
        message['From'] = smtp_username
        message['To'] = user_email
        message['Subject'] = f"Receipt - Zebrafish Registry Subscription"
        
        # Email body with receipt-like formatting
        body = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .receipt {{ max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }}
                .header {{ text-align: center; padding-bottom: 10px; border-bottom: 2px solid #f0f0f0; margin-bottom: 20px; }}
                .info-row {{ display: flex; justify-content: space-between; margin-bottom: 10px; }}
                .total {{ font-weight: bold; padding-top: 10px; border-top: 1px solid #ddd; margin-top: 10px; }}
                .footer {{ margin-top: 30px; font-size: 0.9em; color: #777; text-align: center; }}
            </style>
        </head>
        <body>
            <div class="receipt">
                <div class="header">
                    <h2>Zebrafish Registry</h2>
                    <h3>Payment Receipt</h3>
                    <p>Date: {current_date.strftime('%B %d, %Y')}</p>
                    <p>Transaction ID: {current_date.strftime('%Y%m%d%H%M%S')}</p>
                </div>
                
                <h4>Subscription Details:</h4>
                <div class="info-row">
                    <span>Plan:</span>
                    <span>{plan_name} Plan</span>
                </div>
                <div class="info-row">
                    <span>Duration:</span>
                    <span>{days} days ({period_text})</span>
                </div>
                <div class="info-row">
                    <span>Valid Until:</span>
                    <span>{end_date_str}</span>
                </div>
                
                <h4>Payment Information:</h4>
                <div class="info-row">
                    <span>Subtotal:</span>
                    <span>${amount:.2f} USD</span>
                </div>
                <div class="info-row total">
                    <span>Total Paid:</span>
                    <span>${amount:.2f} USD</span>
                </div>
                
                <div class="footer">
                    <p>Thank you for your subscription to Zebrafish Registry.</p>
                    <p>If you have any questions, please contact support at support@zebrafishregistry.com</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Attach the HTML body
        message.attach(MIMEText(body, 'html'))
        
        # Connect to the server and send email
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_username, smtp_password)
            server.send_message(message)
            
        print(f"Payment receipt email sent to {user_email}")
        return True
        
    except Exception as e:
        print(f"Error sending payment receipt email: {str(e)}")
        return False