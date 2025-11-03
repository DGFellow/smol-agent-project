import json
from datetime import datetime
from typing import List, Dict, Optional

class Conversation:
    """Conversation model"""
    
    def __init__(self, db):
        self.db = db
        self.table_name = 'conversations'
        self.messages_table = 'messages'
        self._create_tables()
    
    def _create_tables(self):
        """Create conversations and messages tables"""
        self.db.execute(f'''
            CREATE TABLE IF NOT EXISTS {self.table_name} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        ''')
        
        self.db.execute(f'''
            CREATE TABLE IF NOT EXISTS {self.messages_table} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id INTEGER NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                agent TEXT,
                model TEXT,
                reaction TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
            )
        ''')
        
        self.db.commit()
    
    def create_conversation(self, user_id: int, title: str = None) -> dict:
        """Create a new conversation"""
        if not title:
            title = f"Conversation {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        
        cursor = self.db.execute(
            f'INSERT INTO {self.table_name} (user_id, title) VALUES (?, ?)',
            (user_id, title)
        )
        self.db.commit()
        
        return self.get_by_id(cursor.lastrowid)
    
    def get_by_id(self, conversation_id: int) -> dict:
        """Get conversation by ID"""
        cursor = self.db.execute(
            f'SELECT * FROM {self.table_name} WHERE id = ?',
            (conversation_id,)
        )
        row = cursor.fetchone()
        if row:
            return dict(zip(['id', 'user_id', 'title', 'created_at', 'updated_at'], row))
        return None
    
    def get_user_conversations(self, user_id: int, limit: int = 50, offset: int = 0) -> List[dict]:
        """Get all conversations for a user with pagination"""
        cursor = self.db.execute(f'''
            SELECT 
                c.id, 
                c.title, 
                c.created_at, 
                c.updated_at, 
                COUNT(m.id) as message_count,
                (SELECT m2.content 
                FROM {self.messages_table} m2 
                WHERE m2.conversation_id = c.id 
                ORDER BY m2.created_at ASC 
                LIMIT 1) as first_message
            FROM {self.table_name} c
            LEFT JOIN {self.messages_table} m ON c.id = m.conversation_id
            WHERE c.user_id = ?
            GROUP BY c.id
            ORDER BY c.updated_at DESC
            LIMIT ? OFFSET ?
        ''', (user_id, limit, offset))
        
        rows = cursor.fetchall()
        conversations = []
        
        for row in rows:
            conv_id = row[0]
            title = row[1]
            created_at = row[2]
            updated_at = row[3]
            message_count = row[4]
            first_message = row[5]
            
            # Generate preview from first message
            preview = ""
            if first_message:
                preview = first_message[:60] + "..." if len(first_message) > 60 else first_message
            
            conversations.append({
                'id': conv_id,
                'session_id': str(conv_id),  # For frontend compatibility
                'title': title or 'Untitled Conversation',
                'created_at': created_at,
                'updated_at': updated_at,
                'message_count': message_count,
                'preview': preview
            })
        
        return conversations
    
    def get_conversation_count(self, user_id: int) -> int:
        """Get total conversation count for user"""
        cursor = self.db.execute(
            f'SELECT COUNT(*) FROM {self.table_name} WHERE user_id = ?',
            (user_id,)
        )
        return cursor.fetchone()[0]
    
    def add_message(self, conversation_id: int, role: str, content: str, 
                   agent: str = None, model: str = None) -> dict:
        """Add a message to a conversation"""
        cursor = self.db.execute(f'''
            INSERT INTO {self.messages_table} 
            (conversation_id, role, content, agent, model) 
            VALUES (?, ?, ?, ?, ?)
        ''', (conversation_id, role, content, agent, model))
        
        # Update conversation timestamp
        self.db.execute(
            f'UPDATE {self.table_name} SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            (conversation_id,)
        )
        
        self.db.commit()
        return {'id': cursor.lastrowid, 'conversation_id': conversation_id}
    
    def get_messages(self, conversation_id: int) -> List[dict]:
        """Get all messages in a conversation"""
        cursor = self.db.execute(f'''
            SELECT id, role, content, agent, model, created_at
            FROM {self.messages_table}
            WHERE conversation_id = ?
            ORDER BY created_at ASC
        ''', (conversation_id,))
        
        rows = cursor.fetchall()
        return [dict(zip(['id', 'role', 'content', 'agent', 'model', 'created_at'], row)) 
                for row in rows]
    
    def delete_conversation(self, conversation_id: int, user_id: int) -> bool:
        """Delete a conversation (with ownership check)"""
        # Verify ownership
        conv = self.get_by_id(conversation_id)
        if not conv or conv['user_id'] != user_id:
            return False
        
        self.db.execute(
            f'DELETE FROM {self.table_name} WHERE id = ?',
            (conversation_id,)
        )
        self.db.commit()
        return True
    
    def update_title(self, conversation_id: int, user_id: int, title: str) -> bool:
        """Update conversation title"""
        conv = self.get_by_id(conversation_id)
        if not conv or conv['user_id'] != user_id:
            return False
        
        self.db.execute(
            f'UPDATE {self.table_name} SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            (title, conversation_id)
        )
        self.db.commit()
        return True