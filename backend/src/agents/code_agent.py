from .base_agent import BaseAgent
from ..prompts import PromptTemplates

class CodeAgent(BaseAgent):
    def __init__(self, model, tokenizer):
        super().__init__(model, tokenizer, max_tokens=4096)
        self.system_prompt = PromptTemplates.CODE_AGENT_SYSTEM
        self.pending_language_request = False
        self.pending_task = None
    
    def generate_code(self, task: str, language: str = None) -> dict:
        """
        Generate code for a specific task
        Returns dict with response and status
        """
        if language:
            # Language specified, generate code
            prompt = PromptTemplates.format_code_request(task, language)
            response = self.generate_response(prompt, self.system_prompt)
            return {
                "response": response,
                "needs_language": False,
                "agent_type": "code"
            }
        else:
            # Ask for language
            response = PromptTemplates.ask_for_language(task)
            self.pending_language_request = True
            self.pending_task = task
            return {
                "response": response,
                "needs_language": True,
                "agent_type": "code"
            }
    
    def handle_language_response(self, language: str) -> dict:
        """Handle user's language specification"""
        if self.pending_task and self.pending_language_request:
            self.pending_language_request = False
            task = self.pending_task
            self.pending_task = None
            return self.generate_code(task, language)
        return {
            "response": "I'm sorry, I don't have a pending code request.",
            "needs_language": False,
            "agent_type": "code"
        }