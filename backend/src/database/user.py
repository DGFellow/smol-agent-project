from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
import secrets
import re

class User:
    """Enhanced User model with full profile and verification"""
    
    def __init__(self, db):
        self.db = db
        self.table_name = 'users'
        self._create_tables()
    
    def _create_tables(self):
        """Create users and related tables"""
        # Main users table
        self.db.execute(f'''
            CREATE TABLE IF NOT EXISTS {self.table_name} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                first_name TEXT,
                last_name TEXT,
                birthdate DATE,
                phone_number TEXT,
                email_verified BOOLEAN DEFAULT 0,
                phone_verified BOOLEAN DEFAULT 0,
                two_factor_enabled BOOLEAN DEFAULT 0,
                two_factor_method TEXT,
                oauth_provider TEXT,
                oauth_provider_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP,
                account_status TEXT DEFAULT 'active'
            )
        ''')
        
        # Email verification tokens
        self.db.execute('''
            CREATE TABLE IF NOT EXISTS email_verifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                verified BOOLEAN DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ''')
        
        # 2FA codes
        self.db.execute('''
            CREATE TABLE IF NOT EXISTS two_factor_codes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                code TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                used BOOLEAN DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ''')
        
        # Password reset tokens
        self.db.execute('''
            CREATE TABLE IF NOT EXISTS password_resets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                used BOOLEAN DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ''')
        
        self.db.commit()
    
    def validate_password(self, password: str) -> tuple[bool, str]:
        """Validate password against modern security criteria"""
        if len(password) < 8:
            return False, "Password must be at least 8 characters long"
        
        if len(password) > 128:
            return False, "Password must not exceed 128 characters"
        
        if not re.search(r'[A-Z]', password):
            return False, "Password must contain at least one uppercase letter"
        
        if not re.search(r'[a-z]', password):
            return False, "Password must contain at least one lowercase letter"
        
        if not re.search(r'\d', password):
            return False, "Password must contain at least one number"
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;/~`]', password):
            return False, "Password must contain at least one special character"
        
        # Check for common patterns
        common_patterns = ['12345', 'password', 'qwerty', 'abc123']
        if any(pattern in password.lower() for pattern in common_patterns):
            return False, "Password contains common patterns and is too weak"
        
        return True, "Password is strong"
    
    def validate_username(self, username: str) -> tuple[bool, str]:
        """Validate username format"""
        if len(username) < 3:
            return False, "Username must be at least 3 characters long"
        
        if len(username) > 30:
            return False, "Username must not exceed 30 characters"
        
        if not re.match(r'^[a-zA-Z0-9_-]+$', username):
            return False, "Username can only contain letters, numbers, hyphens, and underscores"
        
        return True, "Username is valid"
    
    def validate_email(self, email: str) -> tuple[bool, str]:
        """Validate email format"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, email):
            return False, "Invalid email format"
        return True, "Email is valid"
    
    def validate_phone(self, phone: str) -> tuple[bool, str]:
        """Validate phone number format (international format)"""
        # Remove spaces and common separators
        cleaned = re.sub(r'[\s\-\(\)]', '', phone)
        
        # Check if it starts with + and has 10-15 digits
        if not re.match(r'^\+?\d{10,15}$', cleaned):
            return False, "Phone number must be 10-15 digits (international format preferred)"
        
        return True, "Phone number is valid"
    
    def username_exists(self, username: str) -> bool:
        """Check if username already exists"""
        cursor = self.db.execute(
            f'SELECT id FROM {self.table_name} WHERE LOWER(username) = LOWER(?)',
            (username,)
        )
        return cursor.fetchone() is not None
    
    def email_exists(self, email: str) -> bool:
        """Check if email already exists"""
        cursor = self.db.execute(
            f'SELECT id FROM {self.table_name} WHERE LOWER(email) = LOWER(?)',
            (email.lower(),)
        )
        return cursor.fetchone() is not None
    
    def create_user(self, username: str, email: str, password: str, 
                   first_name: str = None, last_name: str = None, 
                   birthdate: str = None, phone_number: str = None,
                   oauth_provider: str = None, oauth_provider_id: str = None) -> dict:
        """Create a new user with full profile"""
        
        # For OAuth users, password can be None
        if not oauth_provider:
            password_hash = generate_password_hash(password)
        else:
            password_hash = None
        
        cursor = self.db.execute(
            f'''INSERT INTO {self.table_name} 
            (username, email, password_hash, first_name, last_name, birthdate, 
             phone_number, oauth_provider, oauth_provider_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (username, email.lower(), password_hash, first_name, last_name, 
             birthdate, phone_number, oauth_provider, oauth_provider_id)
        )
        self.db.commit()
        
        return self.get_by_id(cursor.lastrowid)
    
    def get_by_id(self, user_id: int) -> dict:
        """Get user by ID"""
        cursor = self.db.execute(
            f'''SELECT id, username, email, first_name, last_name, birthdate, 
                       phone_number, email_verified, phone_verified, two_factor_enabled,
                       two_factor_method, oauth_provider, created_at, last_login, account_status
                FROM {self.table_name} WHERE id = ?''',
            (user_id,)
        )
        row = cursor.fetchone()
        if row:
            columns = ['id', 'username', 'email', 'first_name', 'last_name', 'birthdate',
                      'phone_number', 'email_verified', 'phone_verified', 'two_factor_enabled',
                      'two_factor_method', 'oauth_provider', 'created_at', 'last_login', 'account_status']
            return dict(zip(columns, row))
        return None
    
    def get_by_username(self, username: str) -> dict:
        """Get user by username"""
        cursor = self.db.execute(
            f'SELECT * FROM {self.table_name} WHERE LOWER(username) = LOWER(?)',
            (username,)
        )
        row = cursor.fetchone()
        if row:
            cursor.description
            columns = [desc[0] for desc in cursor.description]
            return dict(zip(columns, row))
        return None
    
    def get_by_email(self, email: str) -> dict:
        """Get user by email"""
        cursor = self.db.execute(
            f'SELECT * FROM {self.table_name} WHERE LOWER(email) = LOWER(?)',
            (email.lower(),)
        )
        row = cursor.fetchone()
        if row:
            columns = [desc[0] for desc in cursor.description]
            return dict(zip(columns, row))
        return None
    
    def get_by_oauth(self, provider: str, provider_id: str) -> dict:
        """Get user by OAuth provider and ID"""
        cursor = self.db.execute(
            f'SELECT * FROM {self.table_name} WHERE oauth_provider = ? AND oauth_provider_id = ?',
            (provider, provider_id)
        )
        row = cursor.fetchone()
        if row:
            columns = [desc[0] for desc in cursor.description]
            return dict(zip(columns, row))
        return None
    
    def verify_password(self, username: str, password: str) -> bool:
        """Verify user password"""
        user = self.get_by_username(username)
        if user and user.get('password_hash') and check_password_hash(user['password_hash'], password):
            return True
        return False
    
    def update_password(self, user_id: int, new_password: str):
        """Update user password"""
        password_hash = generate_password_hash(new_password)
        self.db.execute(
            f'UPDATE {self.table_name} SET password_hash = ? WHERE id = ?',
            (password_hash, user_id)
        )
        self.db.commit()
    
    def update_last_login(self, user_id: int):
        """Update last login timestamp"""
        self.db.execute(
            f'UPDATE {self.table_name} SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
            (user_id,)
        )
        self.db.commit()
    
    def update_profile(self, user_id: int, **kwargs):
        """Update user profile fields"""
        allowed_fields = ['first_name', 'last_name', 'birthdate', 'phone_number']
        updates = {k: v for k, v in kwargs.items() if k in allowed_fields}
        
        if not updates:
            return
        
        set_clause = ', '.join([f'{k} = ?' for k in updates.keys()])
        values = list(updates.values()) + [user_id]
        
        self.db.execute(
            f'UPDATE {self.table_name} SET {set_clause} WHERE id = ?',
            values
        )
        self.db.commit()
    
    # Email verification methods
    def create_email_verification_token(self, user_id: int) -> str:
        """Create email verification token"""
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(hours=24)
        
        self.db.execute(
            '''INSERT INTO email_verifications (user_id, token, expires_at)
               VALUES (?, ?, ?)''',
            (user_id, token, expires_at)
        )
        self.db.commit()
        return token
    
    def verify_email_token(self, token: str) -> bool:
        """Verify email token and mark email as verified"""
        cursor = self.db.execute(
            '''SELECT user_id FROM email_verifications 
               WHERE token = ? AND expires_at > ? AND verified = 0''',
            (token, datetime.utcnow())
        )
        row = cursor.fetchone()
        
        if row:
            user_id = row[0]
            # Mark token as used
            self.db.execute(
                'UPDATE email_verifications SET verified = 1 WHERE token = ?',
                (token,)
            )
            # Mark user email as verified
            self.db.execute(
                f'UPDATE {self.table_name} SET email_verified = 1 WHERE id = ?',
                (user_id,)
            )
            self.db.commit()
            return True
        return False
    
    # 2FA methods
    def create_2fa_code(self, user_id: int) -> str:
        """Create 2FA verification code (6 digits)"""
        code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
        expires_at = datetime.utcnow() + timedelta(minutes=10)
        
        self.db.execute(
            '''INSERT INTO two_factor_codes (user_id, code, expires_at)
               VALUES (?, ?, ?)''',
            (user_id, code, expires_at)
        )
        self.db.commit()
        return code
    
    def verify_2fa_code(self, user_id: int, code: str) -> bool:
        """Verify 2FA code"""
        cursor = self.db.execute(
            '''SELECT id FROM two_factor_codes 
               WHERE user_id = ? AND code = ? AND expires_at > ? AND used = 0
               ORDER BY created_at DESC LIMIT 1''',
            (user_id, code, datetime.utcnow())
        )
        row = cursor.fetchone()
        
        if row:
            # Mark code as used
            self.db.execute(
                'UPDATE two_factor_codes SET used = 1 WHERE id = ?',
                (row[0],)
            )
            self.db.commit()
            return True
        return False
    
    def enable_2fa(self, user_id: int, method: str = 'sms'):
        """Enable 2FA for user"""
        self.db.execute(
            f'UPDATE {self.table_name} SET two_factor_enabled = 1, two_factor_method = ? WHERE id = ?',
            (method, user_id)
        )
        self.db.commit()
    
    def disable_2fa(self, user_id: int):
        """Disable 2FA for user"""
        self.db.execute(
            f'UPDATE {self.table_name} SET two_factor_enabled = 0, two_factor_method = NULL WHERE id = ?',
            (user_id,)
        )
        self.db.commit()
    
    # Password reset methods
    def create_password_reset_token(self, user_id: int) -> str:
        """Create password reset token"""
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(hours=1)
        
        self.db.execute(
            '''INSERT INTO password_resets (user_id, token, expires_at)
               VALUES (?, ?, ?)''',
            (user_id, token, expires_at)
        )
        self.db.commit()
        return token
    
    def verify_password_reset_token(self, token: str) -> int:
        """Verify password reset token and return user_id"""
        cursor = self.db.execute(
            '''SELECT user_id FROM password_resets 
               WHERE token = ? AND expires_at > ? AND used = 0''',
            (token, datetime.utcnow())
        )
        row = cursor.fetchone()
        
        if row:
            # Mark token as used
            self.db.execute(
                'UPDATE password_resets SET used = 1 WHERE token = ?',
                (token,)
            )
            self.db.commit()
            return row[0]
        return None