from .base_agent import BaseAgent

class CodeAgent(BaseAgent):
    def __init__(self, model, tokenizer):
        super().__init__(model, tokenizer, max_tokens=4096)
        self.system_prompt = """You are an expert programming assistant. 
You write clean, efficient, and well-documented code.
Always explain your code and provide usage examples."""
    
    def generate_code(self, task: str, language: str = "python") -> str:
        """Generate code for a specific task"""
        prompt = f"Write {language} code to: {task}"
        return self.generate_response(prompt, self.system_prompt)