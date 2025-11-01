# backend/src/routes/auth.py
# Compatible with your existing app.py structure

from flask import request, jsonify
from src.database.user import User
from src.middleware.auth import generate_token, decode_token, check_rate_limit
from src.utils.email_service import send_verification_email, send_2fa_code, send_password_reset_email
from src.utils.sms_service import send_sms_code
from datetime import datetime

def check_username(db):
    """Check if username is available"""
    data = request.json
    username = data.get('username', '').strip()
    
    if not username:
        return jsonify({'error': 'Username is required'}), 400
    
    user_model = User(db)
    is_valid, message = user_model.validate_username(username)
    
    if not is_valid:
        return jsonify({'available': False, 'message': message}), 200
    
    exists = user_model.username_exists(username)
    
    return jsonify({
        'available': not exists,
        'message': 'Username already taken' if exists else 'Username is available'
    }), 200

def check_email(db):
    """Check if email is available"""
    data = request.json
    email = data.get('email', '').strip().lower()
    
    if not email:
        return jsonify({'error': 'Email is required'}), 400
    
    user_model = User(db)
    is_valid, message = user_model.validate_email(email)
    
    if not is_valid:
        return jsonify({'available': False, 'message': message}), 200
    
    exists = user_model.email_exists(email)
    
    return jsonify({
        'available': not exists,
        'message': 'Email already registered' if exists else 'Email is available'
    }), 200

def register(db):
    """Register a new user with full profile"""
    data = request.json
    
    # Extract fields
    username = data.get('username', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    password_confirm = data.get('password_confirm', '')
    first_name = data.get('first_name', '').strip()
    last_name = data.get('last_name', '').strip()
    birthdate = data.get('birthdate', '').strip()
    phone_number = data.get('phone_number', '').strip()
    
    # Rate limiting
    client_ip = request.remote_addr
    if not check_rate_limit(f'register:{client_ip}', max_attempts=3, window=3600):
        return jsonify({'error': 'Too many registration attempts. Please try again later.'}), 429
    
    try:
        user_model = User(db)
        
        # Validation
        is_valid, message = user_model.validate_username(username)
        if not is_valid:
            return jsonify({'error': message}), 400
        
        is_valid, message = user_model.validate_email(email)
        if not is_valid:
            return jsonify({'error': message}), 400
        
        is_valid, message = user_model.validate_password(password)
        if not is_valid:
            return jsonify({'error': message}), 400
        
        if password != password_confirm:
            return jsonify({'error': 'Passwords do not match'}), 400
        
        # Check for duplicates
        if user_model.username_exists(username):
            return jsonify({'error': 'Username already exists'}), 409
        
        if user_model.email_exists(email):
            return jsonify({'error': 'Email already registered'}), 409
        
        # Validate optional fields
        if phone_number:
            is_valid, message = user_model.validate_phone(phone_number)
            if not is_valid:
                return jsonify({'error': message}), 400
        
        if birthdate:
            try:
                datetime.strptime(birthdate, '%Y-%m-%d')
            except ValueError:
                return jsonify({'error': 'Invalid birthdate format. Use YYYY-MM-DD'}), 400
        
        # Create user
        user = user_model.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name or None,
            last_name=last_name or None,
            birthdate=birthdate or None,
            phone_number=phone_number or None
        )
        
        # Create email verification token
        verification_token = user_model.create_email_verification_token(user['id'])
        
        # Send verification email (async in production)
        try:
            send_verification_email(email, username, verification_token)
        except Exception as e:
            print(f"Failed to send verification email: {e}")
        
        # Generate auth token
        token = generate_token(user['id'], user['username'])
        
        return jsonify({
            'message': 'Registration successful! Please check your email to verify your account.',
            'token': token,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'first_name': user['first_name'],
                'last_name': user['last_name'],
                'email_verified': user['email_verified']
            }
        }), 201
    
    except Exception as e:
        print(f"Registration error: {e}")
        return jsonify({'error': 'Registration failed. Please try again.'}), 500

def verify_email(db, token):
    """Verify email with token"""
    try:
        user_model = User(db)
        
        if user_model.verify_email_token(token):
            return jsonify({
                'message': 'Email verified successfully! You can now use all features.'
            }), 200
        else:
            return jsonify({
                'error': 'Invalid or expired verification token'
            }), 400
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def resend_verification(db, current_user):
    """Resend email verification"""
    try:
        user_model = User(db)
        user = user_model.get_by_id(current_user['user_id'])
        
        if user['email_verified']:
            return jsonify({'message': 'Email already verified'}), 200
        
        # Rate limiting
        if not check_rate_limit(f'verify:{user["id"]}', max_attempts=3, window=3600):
            return jsonify({'error': 'Too many verification attempts. Please try again later.'}), 429
        
        # Create new token
        verification_token = user_model.create_email_verification_token(user['id'])
        
        # Send email
        send_verification_email(user['email'], user['username'], verification_token)
        
        return jsonify({
            'message': 'Verification email sent! Please check your inbox.'
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def login(db):
    """Login user with optional 2FA"""
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '')
    two_factor_code = data.get('two_factor_code', '')
    
    # Rate limiting
    client_ip = request.remote_addr
    if not check_rate_limit(f'login:{client_ip}', max_attempts=5, window=300):
        return jsonify({'error': 'Too many login attempts. Please try again later.'}), 429
    
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    
    try:
        user_model = User(db)
        
        # Verify credentials
        if not user_model.verify_password(username, password):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Get user info
        user = user_model.get_by_username(username)
        
        # Check if account is active
        if user.get('account_status') != 'active':
            return jsonify({'error': 'Account is suspended or inactive'}), 403
        
        # Check if 2FA is enabled
        if user.get('two_factor_enabled'):
            if not two_factor_code:
                # Generate and send 2FA code
                code = user_model.create_2fa_code(user['id'])
                
                if user.get('two_factor_method') == 'sms' and user.get('phone_number'):
                    send_sms_code(user['phone_number'], code)
                else:
                    # Fallback to email
                    send_2fa_code(user['email'], code)
                
                return jsonify({
                    'requires_2fa': True,
                    'method': user.get('two_factor_method'),
                    'message': 'Verification code sent. Please check your phone/email.'
                }), 200
            else:
                # Verify 2FA code
                if not user_model.verify_2fa_code(user['id'], two_factor_code):
                    return jsonify({'error': 'Invalid or expired verification code'}), 401
        
        # Update last login
        user_model.update_last_login(user['id'])
        
        # Generate token
        token = generate_token(user['id'], user['username'])
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'first_name': user.get('first_name'),
                'last_name': user.get('last_name'),
                'email_verified': user.get('email_verified'),
                'two_factor_enabled': user.get('two_factor_enabled')
            }
        }), 200
    
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'error': 'Login failed. Please try again.'}), 500

def forgot_password(db):
    """Request password reset"""
    data = request.json
    email = data.get('email', '').strip().lower()
    
    if not email:
        return jsonify({'error': 'Email is required'}), 400
    
    # Rate limiting
    if not check_rate_limit(f'reset:{email}', max_attempts=3, window=3600):
        return jsonify({'error': 'Too many reset attempts. Please try again later.'}), 429
    
    try:
        user_model = User(db)
        user = user_model.get_by_email(email)
        
        if user:
            # Create reset token
            reset_token = user_model.create_password_reset_token(user['id'])
            
            # Send reset email
            send_password_reset_email(email, user['username'], reset_token)
        
        # Always return success to prevent email enumeration
        return jsonify({
            'message': 'If that email exists, a password reset link has been sent.'
        }), 200
    
    except Exception as e:
        return jsonify({'error': 'Password reset request failed'}), 500

def reset_password(db, token):
    """Reset password with token"""
    data = request.json
    new_password = data.get('password', '')
    password_confirm = data.get('password_confirm', '')
    
    if new_password != password_confirm:
        return jsonify({'error': 'Passwords do not match'}), 400
    
    try:
        user_model = User(db)
        
        # Validate password
        is_valid, message = user_model.validate_password(new_password)
        if not is_valid:
            return jsonify({'error': message}), 400
        
        # Verify token and get user_id
        user_id = user_model.verify_password_reset_token(token)
        
        if not user_id:
            return jsonify({'error': 'Invalid or expired reset token'}), 400
        
        # Update password
        user_model.update_password(user_id, new_password)
        
        return jsonify({
            'message': 'Password reset successful! You can now login with your new password.'
        }), 200
    
    except Exception as e:
        return jsonify({'error': 'Password reset failed'}), 500

def verify_token():
    """Verify if token is valid"""
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({'error': 'No token provided'}), 401
    
    try:
        token = auth_header.split(' ')[1]
        payload = decode_token(token)
        
        if not payload:
            return jsonify({'error': 'Invalid token'}), 401
        
        return jsonify({
            'valid': True,
            'user': {
                'id': payload['user_id'],
                'username': payload['username']
            }
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 401

def enable_2fa(db, current_user):
    """Enable 2FA for user"""
    data = request.json
    method = data.get('method', 'sms')
    phone_number = data.get('phone_number')
    
    if method not in ['sms', 'email']:
        return jsonify({'error': 'Invalid 2FA method'}), 400
    
    try:
        user_model = User(db)
        user = user_model.get_by_id(current_user['user_id'])
        
        if method == 'sms':
            if not phone_number:
                if not user.get('phone_number'):
                    return jsonify({'error': 'Phone number required for SMS 2FA'}), 400
                phone_number = user['phone_number']
            else:
                # Validate and update phone number
                is_valid, message = user_model.validate_phone(phone_number)
                if not is_valid:
                    return jsonify({'error': message}), 400
                user_model.update_profile(user['id'], phone_number=phone_number)
        
        # Enable 2FA
        user_model.enable_2fa(user['id'], method)
        
        return jsonify({
            'message': f'Two-factor authentication enabled via {method}'
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def disable_2fa(db, current_user):
    """Disable 2FA for user"""
    try:
        user_model = User(db)
        user_model.disable_2fa(current_user['user_id'])
        
        return jsonify({
            'message': 'Two-factor authentication disabled'
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500