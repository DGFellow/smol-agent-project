"""
Document Search Tool for LangChain Agent
Wraps RAG system as a LangChain tool
"""

from langchain.tools import Tool
from typing import Optional
import sys
import os

# Import RAG system
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from langchain_integration.rag import get_rag_system


class DocumentSearchTool:
    """
    Tool for searching indexed documents
    Used by LangChain agent for RAG
    """
    
    def __init__(self):
        self.rag = get_rag_system()
    
    def search(self, query: str) -> str:
        """
        Search indexed documents
        
        Args:
            query: Search query
            
        Returns:
            Search results
        """
        return self.rag.search(query)
    
    def as_langchain_tool(self) -> Tool:
        """
        Convert to LangChain Tool format
        
        Returns:
            LangChain Tool instance
        """
        return Tool(
            name="DocumentSearch",
            func=self.search,
            description="""Useful for finding information in uploaded documents.
Use this when the user asks about:
- Content from documents they've uploaded
- Specific information that might be in files
- References to "the document" or "my files"

Input should be a search query describing what you're looking for.
Example: "What are the key features?" or "Find information about pricing"

Returns relevant excerpts from indexed documents."""
        )


def create_document_search_tool() -> Tool:
    """Create and return document search tool"""
    tool = DocumentSearchTool()
    return tool.as_langchain_tool()