"""
Authentication routes
"""
from flask import Blueprint, request, jsonify
from src.database.user import User
from src.middleware.auth import generate_token
import re

auth_bp = Blueprint('auth', __name__)

def is_valid_email(email: str) -> bool:
    """Simple email validation"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def register(db):
    """Register a new user"""
    data = request.json
    username = data.get('username', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    # Validation
    if not username or len(username) < 3:
        return jsonify({'error': 'Username must be at least 3 characters'}), 400
    
    if not is_valid_email(email):
        return jsonify({'error': 'Invalid email format'}), 400
    
    if not password or len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    
    try:
        user_model = User(db)
        
        # Check if user exists
        if user_model.exists(username=username):
            return jsonify({'error': 'Username already exists'}), 409
        
        if user_model.exists(email=email):
            return jsonify({'error': 'Email already exists'}), 409
        
        # Create user
        user = user_model.create_user(username, email, password)
        
        # Generate token
        token = generate_token(user['id'], user['username'])
        
        return jsonify({
            'message': 'User created successfully',
            'token': token,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'email': user['email']
            }
        }), 201
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def login(db):
    """Login user"""
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    
    try:
        user_model = User(db)
        
        # Verify credentials
        if not user_model.verify_password(username, password):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Get user info
        user = user_model.get_by_username_safe(username)
        
        if not user:
            return jsonify({'error': 'Invalid credentials'}), 401
        
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
                'email': user['email']
            }
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def verify_token():
    """Verify if token is valid"""
    from src.middleware.auth import decode_token
    
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
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 401