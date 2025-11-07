# chat_agent.py
from .base_agent import BaseAgent
from ..prompts import PromptTemplates
import re

class ChatAgent(BaseAgent):
    """General conversation agent"""
    
    def __init__(self, model, tokenizer):
        super().__init__(model, tokenizer, max_tokens=2048, temperature=0.3)  # Lowered temperature for more deterministic outputs
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
        response = re.sub(r'^\s*(?:🤖\s*)?Assistant\s*\n?', '', response)
        # ensure bullets/numbers start on new lines for markdown lists
        response = re.sub(r'(?<!\n)(\d+\.\s)', r'\n\1', response)
        response = re.sub(r'(?<!\n)-\s', '\n- ', response)
        # FIX: include the string argument when using flags
        response = re.sub(r'^\*\*([^*]+)\*\*:', r'\1:', response, flags=re.MULTILINE)
        response = re.sub(r'###\s+', '', response)
        
        # New: Remove hallucinated questions/answers
        response = re.sub(r'(?:Can you tell me|What can I help with|To be more specific).*?(?:Certainly|Well|I can help with).*?(?:\.|\?)', '', response, flags=re.IGNORECASE | re.DOTALL)
        response = re.sub(r'(User|You):.*?\n?', '', response, flags=re.MULTILINE)  # Strip any role labels
        
        return response.strip()