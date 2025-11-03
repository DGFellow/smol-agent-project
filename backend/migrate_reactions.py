# backend/migrate_reactions.py
# Run this once to add the reaction column to your database

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / 'smol_agent.db'

def migrate():
    """Add reaction column to messages table"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(messages)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'reaction' not in columns:
            print("Adding 'reaction' column to messages table...")
            cursor.execute('''
                ALTER TABLE messages 
                ADD COLUMN reaction TEXT CHECK(reaction IN ('like', 'dislike'))
            ''')
            conn.commit()
            print("✅ Migration successful!")
        else:
            print("✅ Column 'reaction' already exists")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    migrate()