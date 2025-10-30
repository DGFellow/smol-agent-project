from functools import wraps
from flask import request, jsonify
import jwt
import os
from datetime import datetime, timedelta

JWT_SECRET = os.getenv('JWT_SECRET_KEY', 'change-this-secret-key')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 3600)) // 3600

def generate_token(user_id: int, username: str) -> str:
    """Generate JWT token"""
    payload = {
        'user_id': user_id,
        'username': username,
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        'iat': datetime.utcnow()
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    print(f"Generated token for user {username} (ID: {user_id})")  # DEBUG
    return token

def decode_token(token: str) -> dict:
    """Decode and verify JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        print(f"✓ Token decoded successfully for user: {payload.get('username')}")  # DEBUG
        return payload
    except jwt.ExpiredSignatureError:
        print("✗ Token expired")  # DEBUG
        return None
    except jwt.InvalidTokenError as e:
        print(f"✗ Invalid token: {e}")  # DEBUG
        return None

def token_required(f):
    """Decorator to require valid JWT token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        print(f"Auth header received: {auth_header[:50] if auth_header else 'None'}...")  # DEBUG
        
        if auth_header:
            try:
                token = auth_header.split(' ')[1]  # Bearer <token>
                print(f"Extracted token: {token[:50]}...")  # DEBUG
            except IndexError:
                print("✗ Invalid token format (no space after Bearer)")  # DEBUG
                return jsonify({'error': 'Invalid token format'}), 401
        
        if not token:
            print("✗ No token provided")  # DEBUG
            return jsonify({'error': 'Token is missing'}), 401
        
        # Verify token
        payload = decode_token(token)
        if not payload:
            print("✗ Token verification failed")  # DEBUG
            return jsonify({'error': 'Token is invalid or expired'}), 401
        
        # Add user info to request
        request.user_id = payload['user_id']
        request.username = payload['username']
        
        print(f"✓ Request authorized for user: {payload['username']} (ID: {payload['user_id']})")  # DEBUG
        
        return f(*args, **kwargs)
    
    return decorated

def optional_token(f):
    """Decorator for optional authentication"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header:
            try:
                token = auth_header.split(' ')[1]
                payload = decode_token(token)
                if payload:
                    request.user_id = payload['user_id']
                    request.username = payload['username']
                else:
                    request.user_id = None
                    request.username = None
            except:
                request.user_id = None
                request.username = None
        else:
            request.user_id = None
            request.username = None
        
        return f(*args, **kwargs)
    
    return decorated