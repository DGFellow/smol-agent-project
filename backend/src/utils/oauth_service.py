import requests
from urllib.parse import urlencode
from config import Config

class OAuthProvider:
    """Base OAuth provider class"""
    
    def get_authorization_url(self, state: str) -> str:
        """Get OAuth authorization URL"""
        raise NotImplementedError
    
    def exchange_code_for_token(self, code: str) -> dict:
        """Exchange authorization code for access token"""
        raise NotImplementedError
    
    def get_user_info(self, access_token: str) -> dict:
        """Get user information from provider"""
        raise NotImplementedError


class GoogleOAuth(OAuthProvider):
    """Google OAuth 2.0 implementation"""
    
    AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    TOKEN_URL = "https://oauth2.googleapis.com/token"
    USER_INFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
    
    SCOPES = [
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile"
    ]
    
    def get_authorization_url(self, state: str) -> str:
        """Get Google OAuth authorization URL"""
        params = {
            'client_id': Config.GOOGLE_CLIENT_ID,
            'redirect_uri': Config.GOOGLE_REDIRECT_URI,
            'response_type': 'code',
            'scope': ' '.join(self.SCOPES),
            'state': state,
            'access_type': 'offline',
            'prompt': 'consent'
        }
        return f"{self.AUTH_URL}?{urlencode(params)}"
    
    def exchange_code_for_token(self, code: str) -> dict:
        """Exchange authorization code for access token"""
        data = {
            'client_id': Config.GOOGLE_CLIENT_ID,
            'client_secret': Config.GOOGLE_CLIENT_SECRET,
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': Config.GOOGLE_REDIRECT_URI
        }
        
        response = requests.post(self.TOKEN_URL, data=data)
        response.raise_for_status()
        return response.json()
    
    def get_user_info(self, access_token: str) -> dict:
        """Get user information from Google"""
        headers = {'Authorization': f'Bearer {access_token}'}
        response = requests.get(self.USER_INFO_URL, headers=headers)
        response.raise_for_status()
        
        data = response.json()
        
        # Normalize user data
        return {
            'id': data['id'],
            'email': data['email'],
            'email_verified': data.get('verified_email', False),
            'given_name': data.get('given_name', ''),
            'family_name': data.get('family_name', ''),
            'picture': data.get('picture', ''),
            'username': data['email'].split('@')[0]
        }


class GitHubOAuth(OAuthProvider):
    """GitHub OAuth 2.0 implementation"""
    
    AUTH_URL = "https://github.com/login/oauth/authorize"
    TOKEN_URL = "https://github.com/login/oauth/access_token"
    USER_INFO_URL = "https://api.github.com/user"
    USER_EMAIL_URL = "https://api.github.com/user/emails"
    
    SCOPES = ['user:email']
    
    def get_authorization_url(self, state: str) -> str:
        """Get GitHub OAuth authorization URL"""
        params = {
            'client_id': Config.GITHUB_CLIENT_ID,
            'redirect_uri': Config.GITHUB_REDIRECT_URI,
            'scope': ' '.join(self.SCOPES),
            'state': state
        }
        return f"{self.AUTH_URL}?{urlencode(params)}"
    
    def exchange_code_for_token(self, code: str) -> dict:
        """Exchange authorization code for access token"""
        data = {
            'client_id': Config.GITHUB_CLIENT_ID,
            'client_secret': Config.GITHUB_CLIENT_SECRET,
            'code': code,
            'redirect_uri': Config.GITHUB_REDIRECT_URI
        }
        
        headers = {'Accept': 'application/json'}
        response = requests.post(self.TOKEN_URL, data=data, headers=headers)
        response.raise_for_status()
        return response.json()
    
    def get_user_info(self, access_token: str) -> dict:
        """Get user information from GitHub"""
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Accept': 'application/json'
        }
        
        # Get user profile
        response = requests.get(self.USER_INFO_URL, headers=headers)
        response.raise_for_status()
        user_data = response.json()
        
        # Get user emails
        response = requests.get(self.USER_EMAIL_URL, headers=headers)
        response.raise_for_status()
        emails = response.json()
        
        # Find primary verified email
        primary_email = next(
            (e for e in emails if e['primary'] and e['verified']),
            emails[0] if emails else None
        )
        
        # Normalize user data
        return {
            'id': str(user_data['id']),
            'email': primary_email['email'] if primary_email else user_data.get('email', ''),
            'email_verified': primary_email['verified'] if primary_email else False,
            'given_name': user_data.get('name', '').split()[0] if user_data.get('name') else '',
            'family_name': ' '.join(user_data.get('name', '').split()[1:]) if user_data.get('name') else '',
            'picture': user_data.get('avatar_url', ''),
            'username': user_data['login']
        }


# Factory function
def get_oauth_provider(provider: str) -> OAuthProvider:
    """Get OAuth provider instance"""
    providers = {
        'google': GoogleOAuth,
        'github': GitHubOAuth
    }
    
    if provider not in providers:
        raise ValueError(f"Unsupported OAuth provider: {provider}")
    
    return providers[provider]()


# Usage in routes
"""
# Add to backend/src/routes/auth.py

import secrets
from src.utils.oauth_service import get_oauth_provider

# Store for OAuth states (use Redis in production)
oauth_states = {}

@auth_bp.route('/oauth/<provider>/authorize', methods=['GET'])
def oauth_authorize(provider):
    '''Initiate OAuth flow'''
    try:
        oauth = get_oauth_provider(provider)
        
        # Generate random state for CSRF protection
        state = secrets.token_urlsafe(32)
        oauth_states[state] = {
            'provider': provider,
            'created_at': time.time()
        }
        
        # Get authorization URL
        auth_url = oauth.get_authorization_url(state)
        
        return jsonify({
            'authorization_url': auth_url,
            'state': state
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/oauth/<provider>/callback', methods=['POST'])
def oauth_callback(db, provider):
    '''Handle OAuth callback'''
    data = request.json
    code = data.get('code')
    state = data.get('state')
    
    # Verify state (CSRF protection)
    if state not in oauth_states:
        return jsonify({'error': 'Invalid state parameter'}), 400
    
    stored_state = oauth_states.pop(state)
    
    # Check if state is expired (5 minutes)
    if time.time() - stored_state['created_at'] > 300:
        return jsonify({'error': 'State expired'}), 400
    
    try:
        oauth = get_oauth_provider(provider)
        
        # Exchange code for token
        token_data = oauth.exchange_code_for_token(code)
        access_token = token_data['access_token']
        
        # Get user info
        user_data = oauth.get_user_info(access_token)
        
        # Check if user exists
        user_model = User(db)
        user = user_model.get_by_oauth(provider, user_data['id'])
        
        if not user:
            # Check if email exists
            user = user_model.get_by_email(user_data['email'])
            
            if user:
                # Link OAuth to existing account
                # Update user to add OAuth provider
                db.execute(
                    f'''UPDATE users 
                       SET oauth_provider = ?, oauth_provider_id = ?
                       WHERE id = ?''',
                    (provider, user_data['id'], user['id'])
                )
                db.commit()
            else:
                # Create new user
                username = user_data['username']
                base_username = username
                counter = 1
                
                # Ensure unique username
                while user_model.username_exists(username):
                    username = f"{base_username}{counter}"
                    counter += 1
                
                user = user_model.create_user(
                    username=username,
                    email=user_data['email'],
                    password=None,  # No password for OAuth users
                    first_name=user_data.get('given_name'),
                    last_name=user_data.get('family_name'),
                    oauth_provider=provider,
                    oauth_provider_id=user_data['id']
                )
                
                # Mark email as verified (OAuth emails are pre-verified)
                db.execute(
                    'UPDATE users SET email_verified = 1 WHERE id = ?',
                    (user['id'],)
                )
                db.commit()
        
        # Update last login
        user_model.update_last_login(user['id'])
        
        # Generate JWT
        from src.middleware.auth import generate_token
        token = generate_token(user['id'], user['username'])
        
        return jsonify({
            'message': 'OAuth login successful',
            'token': token,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'first_name': user.get('first_name'),
                'last_name': user.get('last_name'),
                'email_verified': True
            }
        }), 200
    
    except Exception as e:
        print(f"OAuth callback error: {e}")
        return jsonify({'error': 'OAuth authentication failed'}), 500
"""