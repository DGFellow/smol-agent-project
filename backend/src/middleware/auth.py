# backend/src/middleware/auth.py
import jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify
from config import Config

def generate_token(user_id: int, username: str, expires_in_hours: int = None) -> str:
    """Generate JWT token for user"""
    if expires_in_hours is None:
        expires_in_hours = Config.JWT_EXPIRATION_HOURS
    
    payload = {
        'user_id': user_id,
        'username': username,
        'exp': datetime.utcnow() + timedelta(hours=expires_in_hours),
        'iat': datetime.utcnow()
    }
    
    token = jwt.encode(payload, Config.JWT_SECRET, algorithm='HS256')
    return token

def decode_token(token: str) -> dict:
    """Decode and verify JWT token"""
    print(f"Decoding token: {token} with secret: {Config.JWT_SECRET}")
    try:
        payload = jwt.decode(token, Config.JWT_SECRET, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
    

def token_required(f):
    """Decorator to require authentication (your existing implementation)"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return jsonify({'error': 'No authorization token provided'}), 401
        
        try:
            parts = auth_header.split()
            if len(parts) != 2 or parts[0].lower() != 'bearer':
                return jsonify({'error': 'Invalid authorization header format'}), 401
            
            token = parts[1]
            payload = decode_token(token)
            
            if not payload:
                return jsonify({'error': 'Invalid or expired token'}), 401
            
            # Add user_id to request object (your existing pattern)
            request.user_id = payload['user_id']
            request.username = payload.get('username')
            
            return f(*args, **kwargs)
        
        except Exception as e:
            return jsonify({'error': 'Authorization failed'}), 401
    
    return decorated_function

def requires_auth(f):
    """Alternative decorator name for compatibility"""
    return token_required(f)

def requires_verified_email(f):
    """Decorator to require verified email"""
    @wraps(f)
    @token_required
    def decorated_function(*args, **kwargs):
        from src.database.db import Database
        from src.database.user import User
        
        db_manager = Database()
        db = db_manager.connect()
        user_model = User(db)
        user = user_model.get_by_id(request.user_id)
        
        if not user or not user.get('email_verified'):
            return jsonify({
                'error': 'Email verification required',
                'requires_verification': True
            }), 403
        
        return f(*args, **kwargs)
    
    return decorated_function

# Rate limiting helper (simple in-memory version)
from collections import defaultdict
from time import time

rate_limit_store = defaultdict(list)

def check_rate_limit(key: str, max_attempts: int = 5, window: int = 300) -> bool:
    """Simple in-memory rate limiting"""
    if not Config.RATE_LIMIT_ENABLED:
        return True
    
    now = time()
    rate_limit_store[key] = [t for t in rate_limit_store[key] if now - t < window]
    
    if len(rate_limit_store[key]) >= max_attempts:
        return False
    
    rate_limit_store[key].append(now)
    return True