# backend/src/database/chroma_adapter.py

import chromadb
from config import Config

class ChromaUserStore:
    def __init__(self):
        self.client = chromadb.PersistentClient(path=Config.VECTOR_DB_PATH)
        self.collection = self.client.get_or_create_collection("users")
    
    def create_user(self, user_data):
        # Store user as document with metadata
        self.collection.add(
            documents=[str(user_data)],
            metadatas=[user_data],
            ids=[str(user_data['id'])]
        )
    
    def get_by_username(self, username):
        results = self.collection.get(
            where={"username": username}
        )
        return results['metadatas'][0] if results else None