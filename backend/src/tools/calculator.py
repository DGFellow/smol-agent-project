"""
Mathematical calculator tool
"""
import re
import math
from typing import Union

class Calculator:
    """Safe mathematical expression evaluator"""
    
    # Allowed functions
    SAFE_FUNCTIONS = {
        'abs': abs, 'round': round, 'min': min, 'max': max,
        'sin': math.sin, 'cos': math.cos, 'tan': math.tan,
        'sqrt': math.sqrt, 'log': math.log, 'log10': math.log10,
        'exp': math.exp, 'pow': pow, 'pi': math.pi, 'e': math.e
    }
    
    @staticmethod
    def evaluate(expression: str) -> Union[float, str]:
        """
        Safely evaluate mathematical expression
        Returns: result as float or error message as string
        """
        try:
            # Remove spaces
            expression = expression.strip()
            
            # Check for dangerous patterns
            dangerous = ['import', '__', 'exec', 'eval', 'open', 'file']
            if any(d in expression.lower() for d in dangerous):
                return "Error: Invalid expression"
            
            # Create safe namespace
            safe_dict = {"__builtins__": {}}
            safe_dict.update(Calculator.SAFE_FUNCTIONS)
            
            # Evaluate
            result = eval(expression, safe_dict, {})
            return float(result)
            
        except ZeroDivisionError:
            return "Error: Division by zero"
        except Exception as e:
            return f"Error: {str(e)}"
    
    @staticmethod
    def detect_calculation(text: str) -> bool:
        """Check if text contains a calculation request"""
        calc_patterns = [
            r'calculate', r'compute', r'what is \d+', r'solve',
            r'\d+\s*[\+\-\*\/]\s*\d+', r'=\s*\?'
        ]
        return any(re.search(pattern, text.lower()) for pattern in calc_patterns)