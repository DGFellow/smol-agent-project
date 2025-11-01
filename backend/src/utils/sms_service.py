from config import Config

def send_sms_code(phone_number: str, code: str):
    """Send 2FA code via SMS using Twilio"""
    if not Config.SMS_ENABLED:
        print(f"📱 SMS disabled. Would send to {phone_number}: {code}")
        return
    
    try:
        from twilio.rest import Client
        
        client = Client(Config.TWILIO_ACCOUNT_SID, Config.TWILIO_AUTH_TOKEN)
        
        message_body = f"Smolagent verification code: {code}\n\nExpires in 10 minutes."
        
        message = client.messages.create(
            body=message_body,
            from_=Config.TWILIO_PHONE_NUMBER,
            to=phone_number
        )
        
        print(f"✓ SMS sent to {phone_number}")
        
    except ImportError:
        print("⚠️  Twilio not installed. Run: pip install twilio")
    except Exception as e:
        print(f"✗ SMS failed: {e}")
        raise