from .base_agent import BaseAgent
from ..prompts import PromptTemplates
import re

class ChatAgent(BaseAgent):
    """General conversation agent"""
    
    def __init__(self, model, tokenizer):
        super().__init__(model, tokenizer, max_tokens=2048, temperature=0.7)
        self.system_prompt = PromptTemplates.CHAT_AGENT_SYSTEM
    
    def chat(self, message: str) -> dict:
        """Process a general chat message"""
        response = self.generate_response(message, self.system_prompt)
        
        # Clean up response
        response = self._clean_response(response)
        
        return {
            "response": response,
            "agent_type": "chat"
        }
    
    def _clean_response(self, response: str) -> str:
        """Clean up formatting issues"""
        # Remove excessive markdown formatting
        # strip Assistant prefix
        response = re.sub(r'^\s*(?:🤖\s*)?Assistant\s*\n?', '', response)  # strip Assistant prefix
        # ensure bullets/numbers start on new lines for markdown lists
        response = re.sub(r'(?<!\n)(\d+\.\s)', r'\n\1', response)
        response = re.sub(r'(?<!\n)-\s', '\n- ', response)
        response = re.sub(r'^\*\*([^*]+)\*\*:', r'\1:', flags=re.MULTILINE)
        response = re.sub(r'###\s+', '', response)  # Remove header markers
        
        return response.strip()