import sqlite3
from pathlib import Path
from contextlib import contextmanager

class Database:
    """SQLite database manager"""
    
    def __init__(self, db_path: str = "smol_agent.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.connection = None
    
    def connect(self):
        """Create database connection"""
        self.connection = sqlite3.connect(self.db_path, check_same_thread=False)
        self.connection.row_factory = sqlite3.Row
        return self.connection
    
    def close(self):
        """Close database connection"""
        if self.connection:
            self.connection.close()
    
    @contextmanager
    def get_db(self):
        """Context manager for database operations"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()