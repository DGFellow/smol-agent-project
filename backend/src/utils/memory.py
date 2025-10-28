"""
Conversation memory system for persisting chat history
"""
from typing import List, Dict, Optional
import json
from pathlib import Path
from datetime import datetime

class ConversationMemory:
    """Persist and load conversation history"""
    
    def __init__(self, storage_dir="data/conversations"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
    
    def save_conversation(self, session_id: str, messages: List[Dict]) -> bool:
        """
        Save conversation to file
        Returns: True if successful
        """
        try:
            file_path = self.storage_dir / f"{session_id}.json"
            data = {
                "session_id": session_id,
                "created_at": datetime.now().isoformat(),
                "messages": messages
            }
            with open(file_path, 'w') as f:
                json.dump(data, f, indent=2)
            return True
        except Exception as e:
            print(f"Error saving conversation: {e}")
            return False
    
    def load_conversation(self, session_id: str) -> Optional[List[Dict]]:
        """
        Load conversation from file
        Returns: List of messages or None if not found
        """
        try:
            file_path = self.storage_dir / f"{session_id}.json"
            if file_path.exists():
                with open(file_path, 'r') as f:
                    data = json.load(f)
                return data.get("messages", [])
            return None
        except Exception as e:
            print(f"Error loading conversation: {e}")
            return None
    
    def list_conversations(self) -> List[Dict[str, str]]:
        """
        List all saved conversations
        Returns: List of {"session_id": str, "created_at": str}
        """
        conversations = []
        for file_path in self.storage_dir.glob("*.json"):
            try:
                with open(file_path, 'r') as f:
                    data = json.load(f)
                conversations.append({
                    "session_id": data.get("session_id"),
                    "created_at": data.get("created_at"),
                    "message_count": len(data.get("messages", []))
                })
            except Exception:
                continue
        return sorted(conversations, key=lambda x: x["created_at"], reverse=True)
    
    def delete_conversation(self, session_id: str) -> bool:
        """Delete a conversation"""
        try:
            file_path = self.storage_dir / f"{session_id}.json"
            if file_path.exists():
                file_path.unlink()
                return True
            return False
        except Exception as e:
            print(f"Error deleting conversation: {e}")
            return False