from .base_agent import BaseAgent
from ..prompts import PromptTemplates

class ChatAgent(BaseAgent):
    """General conversation agent"""
    
    def __init__(self, model, tokenizer):
        super().__init__(model, tokenizer, max_tokens=2048, temperature=0.7)
        self.system_prompt = PromptTemplates.CHAT_AGENT_SYSTEM
    
    def chat(self, message: str) -> dict:
        """
        Process a general chat message
        """
        response = self.generate_response(message, self.system_prompt)
        return {
            "response": response,
            "agent_type": "chat"
        }