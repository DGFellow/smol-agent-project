"""
RAG (Retrieval Augmented Generation) System
Uses LlamaIndex + ChromaDB for document indexing and retrieval
"""

import os
from pathlib import Path
from typing import List, Optional
from llama_index.core import (
    VectorStoreIndex,
    SimpleDirectoryReader,
    StorageContext,
    Settings,
    Document
)
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.vector_stores.chroma import ChromaVectorStore
import chromadb


class RAGSystem:
    """
    Document retrieval system using LlamaIndex + ChromaDB
    """
    
    def __init__(
        self,
        documents_dir: str = "data/documents",
        vector_store_dir: str = "data/vector_store",
        collection_name: str = "smol_agent_docs"
    ):
        self.documents_dir = Path(documents_dir)
        self.vector_store_dir = Path(vector_store_dir)
        self.collection_name = collection_name
        
        self.index = None
        self.query_engine = None
        
        # Ensure directories exist
        self.documents_dir.mkdir(parents=True, exist_ok=True)
        self.vector_store_dir.mkdir(parents=True, exist_ok=True)
        
        self._initialize()
    
    def _initialize(self):
        """Initialize embeddings and vector store"""
        print("🔍 Initializing RAG system...")
        
        # Set up embeddings (using HuggingFace)
        Settings.embed_model = HuggingFaceEmbedding(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            cache_folder="./model_cache"
        )
        
        # Initialize ChromaDB
        chroma_client = chromadb.PersistentClient(path=str(self.vector_store_dir))
        chroma_collection = chroma_client.get_or_create_collection(self.collection_name)
        
        # Create vector store
        vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
        storage_context = StorageContext.from_defaults(vector_store=vector_store)
        
        # Check if we have existing index
        if self._has_documents():
            print("📚 Loading existing document index...")
            self.index = VectorStoreIndex.from_vector_store(
                vector_store,
                storage_context=storage_context
            )
        else:
            print("📝 Creating new empty index...")
            self.index = VectorStoreIndex.from_documents(
                [],
                storage_context=storage_context
            )
        
        # Create query engine
        self.query_engine = self.index.as_query_engine(
            similarity_top_k=3,
            response_mode="compact"
        )
        
        print("✅ RAG system ready!")
    
    def _has_documents(self) -> bool:
        """Check if vector store has any documents"""
        try:
            chroma_client = chromadb.PersistentClient(path=str(self.vector_store_dir))
            collection = chroma_client.get_collection(self.collection_name)
            return collection.count() > 0
        except:
            return False
    
    def index_documents(self, file_paths: Optional[List[str]] = None) -> dict:
        """
        Index documents from directory or specific files
        
        Args:
            file_paths: Optional list of specific files to index
            
        Returns:
            dict with indexing statistics
        """
        print(f"📥 Indexing documents...")
        
        try:
            if file_paths:
                # Index specific files
                documents = []
                for file_path in file_paths:
                    reader = SimpleDirectoryReader(input_files=[file_path])
                    docs = reader.load_data()
                    documents.extend(docs)
            else:
                # Index entire directory
                if not list(self.documents_dir.glob("*")):
                    return {
                        "success": False,
                        "message": "No documents found",
                        "indexed": 0
                    }
                
                reader = SimpleDirectoryReader(str(self.documents_dir))
                documents = reader.load_data()
            
            if not documents:
                return {
                    "success": False,
                    "message": "No documents to index",
                    "indexed": 0
                }
            
            # Add documents to index
            for doc in documents:
                self.index.insert(doc)
            
            print(f"✅ Indexed {len(documents)} documents")
            
            return {
                "success": True,
                "message": f"Successfully indexed {len(documents)} documents",
                "indexed": len(documents)
            }
            
        except Exception as e:
            print(f"❌ Indexing error: {e}")
            return {
                "success": False,
                "message": f"Error: {str(e)}",
                "indexed": 0
            }
    
    def search(self, query: str, top_k: int = 3) -> str:
        """
        Search indexed documents
        
        Args:
            query: Search query
            top_k: Number of results to return
            
        Returns:
            Search results as formatted string
        """
        try:
            if not self._has_documents():
                return "No documents have been indexed yet. Please upload documents first."
            
            # Update query engine with top_k
            self.query_engine = self.index.as_query_engine(
                similarity_top_k=top_k,
                response_mode="compact"
            )
            
            # Query
            response = self.query_engine.query(query)
            
            return str(response)
            
        except Exception as e:
            print(f"❌ Search error: {e}")
            return f"Error searching documents: {str(e)}"
    
    def get_stats(self) -> dict:
        """Get RAG system statistics"""
        try:
            chroma_client = chromadb.PersistentClient(path=str(self.vector_store_dir))
            collection = chroma_client.get_collection(self.collection_name)
            doc_count = collection.count()
            
            return {
                "total_documents": doc_count,
                "documents_dir": str(self.documents_dir),
                "vector_store_dir": str(self.vector_store_dir),
                "embedding_model": "sentence-transformers/all-MiniLM-L6-v2"
            }
        except Exception as e:
            return {
                "error": str(e),
                "total_documents": 0
            }
    
    def clear_index(self):
        """Clear all indexed documents"""
        try:
            chroma_client = chromadb.PersistentClient(path=str(self.vector_store_dir))
            chroma_client.delete_collection(self.collection_name)
            print("✅ Index cleared")
            self._initialize()  # Reinitialize
        except Exception as e:
            print(f"❌ Error clearing index: {e}")


# Global instance
rag_system = None


def get_rag_system() -> RAGSystem:
    """Get or create RAG system instance"""
    global rag_system
    if rag_system is None:
        rag_system = RAGSystem()
    return rag_system


def initialize_rag():
    """Initialize RAG system"""
    global rag_system
    rag_system = RAGSystem()
    return rag_system