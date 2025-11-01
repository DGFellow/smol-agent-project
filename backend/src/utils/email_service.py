import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import Config

def send_email(to_email: str, subject: str, html_content: str, text_content: str = None):
    """Send email using SMTP"""
    if not Config.EMAIL_ENABLED:
        print(f"📧 Email disabled. Would send to {to_email}: {subject}")
        return
    
    try:
        msg = MIMEMultipart('alternative')
        msg['From'] = f"{Config.EMAIL_FROM_NAME} <{Config.EMAIL_FROM_ADDRESS}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        
        if text_content:
            part1 = MIMEText(text_content, 'plain')
            msg.attach(part1)
        
        part2 = MIMEText(html_content, 'html')
        msg.attach(part2)
        
        with smtplib.SMTP(Config.EMAIL_HOST, Config.EMAIL_PORT) as server:
            if Config.EMAIL_USE_TLS:
                server.starttls()
            server.login(Config.EMAIL_USERNAME, Config.EMAIL_PASSWORD)
            server.send_message(msg)
        
        print(f"✓ Email sent to {to_email}")
    
    except Exception as e:
        print(f"✗ Email failed to {to_email}: {e}")
        raise

def send_verification_email(email: str, username: str, token: str):
    """Send email verification"""
    verification_url = f"{Config.FRONTEND_URL}/verify-email/{token}"
    
    subject = "Verify Your Email - Smolagent"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #667eea;">Welcome to Smolagent!</h1>
            <p>Hi {username},</p>
            <p>Thanks for signing up! Click below to verify your email:</p>
            <p style="text-align: center; margin: 30px 0;">
                <a href="{verification_url}" 
                   style="background: #667eea; color: white; padding: 12px 30px; 
                          text-decoration: none; border-radius: 5px; display: inline-block;">
                    Verify Email
                </a>
            </p>
            <p style="color: #666; font-size: 12px;">
                Link expires in 24 hours. If you didn't sign up, ignore this email.
            </p>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
    Welcome to Smolagent!
    
    Hi {username}, verify your email: {verification_url}
    
    Link expires in 24 hours.
    """
    
    send_email(email, subject, html_content, text_content)

def send_2fa_code(email: str, code: str):
    """Send 2FA code via email"""
    subject = "Your Verification Code - Smolagent"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Your Login Verification Code</h2>
            <div style="background: #f0f0f0; padding: 20px; text-align: center; 
                        font-size: 32px; font-weight: bold; letter-spacing: 5px;">
                {code}
            </div>
            <p>This code expires in 10 minutes.</p>
        </div>
    </body>
    </html>
    """
    
    send_email(email, subject, html_content, f"Your verification code: {code}")

def send_password_reset_email(email: str, username: str, token: str):
    """Send password reset email"""
    reset_url = f"{Config.FRONTEND_URL}/reset-password/{token}"
    
    subject = "Reset Your Password - Smolagent"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1>Password Reset Request</h1>
            <p>Hi {username},</p>
            <p>Click below to reset your password:</p>
            <p style="text-align: center; margin: 30px 0;">
                <a href="{reset_url}" 
                   style="background: #e74c3c; color: white; padding: 12px 30px; 
                          text-decoration: none; border-radius: 5px; display: inline-block;">
                    Reset Password
                </a>
            </p>
            <p style="color: #666; font-size: 12px;">
                Link expires in 1 hour. If you didn't request this, ignore this email.
            </p>
        </div>
    </body>
    </html>
    """
    
    send_email(email, subject, html_content, f"Reset password: {reset_url}")