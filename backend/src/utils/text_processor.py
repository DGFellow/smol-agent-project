"""
Text processing utilities for message handling
"""
import re
from typing import Dict, List, Tuple

class TextProcessor:
    """Utilities for processing and formatting text"""
    
    @staticmethod
    def extract_code_blocks(text: str) -> List[Tuple[str, str]]:
        """
        Extract code blocks from markdown-style text
        Returns: List of (language, code) tuples
        """
        pattern = r'```(\w+)?\n(.*?)```'
        matches = re.findall(pattern, text, re.DOTALL)
        return [(lang or 'text', code.strip()) for lang, code in matches]
    
    @staticmethod
    def has_code_blocks(text: str) -> bool:
        """Check if text contains code blocks"""
        return '```' in text
    
    @staticmethod
    def clean_code_markers(text: str) -> str:
        """Remove markdown code block markers"""
        return re.sub(r'```\w*\n?', '', text)
    
    @staticmethod
    def split_explanation_and_code(text: str) -> Dict[str, str]:
        """
        Split response into explanation and code parts
        Returns: {"explanation": str, "code": str, "has_code": bool}
        """
        if not TextProcessor.has_code_blocks(text):
            return {
                "explanation": text.strip(),
                "code": "",
                "has_code": False
            }
        
        # Find first code block
        match = re.search(r'(.*?)```', text, re.DOTALL)
        explanation = match.group(1).strip() if match else ""
        
        # Extract all code
        code_blocks = TextProcessor.extract_code_blocks(text)
        code = "\n\n".join([f"```{lang}\n{code}\n```" for lang, code in code_blocks])
        
        return {
            "explanation": explanation,
            "code": code,
            "has_code": True
        }
    
    @staticmethod
    def truncate_text(text: str, max_length: int = 100) -> str:
        """Truncate text to max length with ellipsis"""
        if len(text) <= max_length:
            return text
        return text[:max_length-3] + "..."
    
    @staticmethod
    def count_tokens_estimate(text: str) -> int:
        """
        Rough estimate of token count
        (More accurate counting requires tokenizer)
        """
        # Rough estimate: ~4 chars per token on average
        return len(text) // 4
    
    @staticmethod
    def sanitize_input(text: str) -> str:
        """Basic input sanitization"""
        # Remove null bytes and control characters except newlines/tabs
        text = re.sub(r'[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]', '', text)
        # Limit consecutive newlines
        text = re.sub(r'\n{4,}', '\n\n\n', text)
        return text.strip()