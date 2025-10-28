from .base_agent import BaseAgent
from ..prompts import PromptTemplates

class RouterAgent(BaseAgent):
    """Routes user requests to appropriate specialized agent"""
    
    def __init__(self, model, tokenizer):
        super().__init__(model, tokenizer, max_tokens=50, temperature=0.3)
        self.system_prompt = PromptTemplates.ROUTER_SYSTEM
    
    def route_request(self, user_message: str) -> str:
        """
        Determine which agent should handle the request
        Returns: 'code' or 'chat'
        """
        # Clear history for routing decision
        original_history = self.conversation_history.copy()
        self.conversation_history = []
        
        response = self.generate_response(user_message, self.system_prompt)
        
        # Restore history
        self.conversation_history = original_history
        
        # Parse response
        response_clean = response.strip().upper()
        
        if "CODE_GENERATION" in response_clean or "CODE" in response_clean:
            return "code"
        else:
            return "chat"

class LanguageDetectorAgent(BaseAgent):
    """Detects programming language from user request"""
    
    def __init__(self, model, tokenizer):
        super().__init__(model, tokenizer, max_tokens=30, temperature=0.1)
        self.system_prompt = PromptTemplates.LANGUAGE_DETECTOR_SYSTEM
    
    def detect_language(self, user_message: str) -> str:
        """
        Detect programming language from request
        Returns: language name or 'UNCLEAR'
        """
        # Clear history for detection
        original_history = self.conversation_history.copy()
        self.conversation_history = []
        
        response = self.generate_response(user_message, self.system_prompt)
        
        # Restore history
        self.conversation_history = original_history
        
        # Parse response
        response_clean = response.strip().lower()
        
        # Map common variations
        language_map = {
            'python': 'python',
            'py': 'python',
            'javascript': 'javascript',
            'js': 'javascript',
            'typescript': 'typescript',
            'ts': 'typescript',
            'java': 'java',
            'cpp': 'cpp',
            'c++': 'cpp',
            'c': 'c',
            'rust': 'rust',
            'go': 'go',
            'golang': 'go',
            'ruby': 'ruby',
            'php': 'php',
            'swift': 'swift',
            'kotlin': 'kotlin',
        }
        
        for key, value in language_map.items():
            if key in response_clean:
                return value
        
        return 'UNCLEAR'