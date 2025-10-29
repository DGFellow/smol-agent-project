from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

class User:
    """User model"""
    
    def __init__(self, db):
        self.db = db
        self.table_name = 'users'
        self._create_table()
    
    def _create_table(self):
        """Create users table"""
        self.db.execute(f'''
            CREATE TABLE IF NOT EXISTS {self.table_name} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            )
        ''')
        self.db.commit()
    
    def create_user(self, username: str, email: str, password: str) -> dict:
        """Create a new user"""
        password_hash = generate_password_hash(password)
        
        cursor = self.db.execute(
            f'INSERT INTO {self.table_name} (username, email, password_hash) VALUES (?, ?, ?)',
            (username, email, password_hash)
        )
        self.db.commit()
        
        return self.get_by_id(cursor.lastrowid)
    
    def get_by_id(self, user_id: int) -> dict:
        """Get user by ID"""
        cursor = self.db.execute(
            f'SELECT id, username, email, created_at, last_login FROM {self.table_name} WHERE id = ?',
            (user_id,)
        )
        row = cursor.fetchone()
        if row:
            return dict(zip(['id', 'username', 'email', 'created_at', 'last_login'], row))
        return None
    
    def get_by_username(self, username: str) -> dict:
        """Get user by username"""
        cursor = self.db.execute(
            f'SELECT id, username, email, password_hash, created_at FROM {self.table_name} WHERE username = ?',
            (username,)
        )
        row = cursor.fetchone()
        if row:
            return dict(zip(['id', 'username', 'email', 'password_hash', 'created_at'], row))
        return None
    
    def verify_password(self, username: str, password: str) -> bool:
        """Verify user password"""
        user = self.get_by_username(username)
        if user and check_password_hash(user['password_hash'], password):
            return True
        return False
    
    def update_last_login(self, user_id: int):
        """Update last login timestamp"""
        self.db.execute(
            f'UPDATE {self.table_name} SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
            (user_id,)
        )
        self.db.commit()