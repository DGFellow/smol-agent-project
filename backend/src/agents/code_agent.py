from .base_agent import BaseAgent
from ..prompts import PromptTemplates

class CodeAgent(BaseAgent):
    def __init__(self, model, tokenizer):
        super().__init__(model, tokenizer, max_tokens=4096, temperature=0.7)
        self.system_prompt = PromptTemplates.CODE_AGENT_SYSTEM
        self.pending_language_request = False
        self.pending_task = None
    
    def generate_code(self, task: str, language: str = None) -> dict:
        """Generate code with natural explanation"""
        if language:
            # Add instruction for natural formatting
            prompt = f"""{task}

Please provide:
1. A brief explanation in plain text
2. The code in a ```{language} code block
3. A simple usage example if helpful

Write naturally without markdown bold (**) or other formatting markers."""
            
            response = self.generate_response(prompt, self.system_prompt)
            
            # Clean up any remaining formatting markers
            response = self._clean_response(response)
            
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
            return self.generate_code(task, language.lower().strip())
        return {
            "response": "I don't have a pending code request.",
            "needs_language": False,
            "agent_type": "code"
        }
    
    def _clean_response(self, response: str) -> str:
        """Remove markdown formatting markers that shouldn't display"""
        import re
        
        # Remove bold markers at start of lines
        response = re.sub(r'^\*\*([^*]+)\*\*:', r'\1:', flags=re.MULTILINE)
        response = re.sub(r'^\*\*([^*]+)\*\*', r'\1', flags=re.MULTILINE)
        
        # Remove inline bold that looks like formatting
        response = re.sub(r'\*\*Brief explanation\*\*', 'Brief explanation', flags=re.IGNORECASE)
        response = re.sub(r'\*\*Usage\*\*', 'Usage', flags=re.IGNORECASE)
        
        return response.strip()