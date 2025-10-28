"""
Web search tool (placeholder for future implementation)
"""
from typing import List, Dict

class WebSearch:
    """
    Web search functionality
    Note: Requires API key for actual implementation (DuckDuckGo, Brave, etc.)
    """
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key
        self.enabled = False  # Set to True when API configured
    
    def search(self, query: str, num_results: int = 3) -> List[Dict[str, str]]:
        """
        Search the web for query
        Returns: List of {"title": str, "url": str, "snippet": str}
        """
        if not self.enabled:
            return [{
                "title": "Web Search Not Configured",
                "url": "",
                "snippet": "To enable web search, configure an API key in .env"
            }]
        
        # TODO: Implement actual search using DuckDuckGo or Brave API
        return []
    
    @staticmethod
    def detect_search_request(text: str) -> bool:
        """Check if user wants to search the web"""
        search_keywords = ['search', 'look up', 'find', 'google', 'web']
        text_lower = text.lower()
        return any(keyword in text_lower for keyword in search_keywords)