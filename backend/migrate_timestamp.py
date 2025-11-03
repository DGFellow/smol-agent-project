# backend/migrate_timestamps.py
from src.database.db import Database

db_manager = Database()
db = db_manager.connect()

# Add to messages
try:
    db.execute("ALTER TABLE messages ADD COLUMN updated_at TEXT;")
    db.commit()
    print("Added updated_at to messages table.")
except Exception as e:
    print(f"Messages table already updated or error: {e}")

# Add to conversations
try:
    db.execute("ALTER TABLE conversations ADD COLUMN updated_at TEXT;")
    db.commit()
    print("Added updated_at to conversations table.")
except Exception as e:
    print(f"Conversations table already updated or error: {e}")