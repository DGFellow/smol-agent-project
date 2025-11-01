# backend/migrate_to_chroma.py

import sqlite3
from src.database.chroma_adapter import ChromaUserStore

def migrate():
    # Read from SQLite
    db = sqlite3.connect('smol_agent.db')
    cursor = db.execute('SELECT * FROM users')
    
    # Write to Chroma
    chroma = ChromaUserStore()
    for row in cursor:
        user_data = dict(zip([d[0] for d in cursor.description], row))
        chroma.create_user(user_data)
    
    print("Migration complete!")

if __name__ == '__main__':
    migrate()