"""
Conversation title generator
"""
import re

def truncate_title(text: str, max_length: int = 50) -> str:
    """
    Generate a simple title by truncating the first message
    """
    # Remove extra whitespace
    text = ' '.join(text.split())
    
    # Remove markdown formatting
    text = re.sub(r'[#*`_~]', '', text)
    
    # Truncate
    if len(text) <= max_length:
        return text
    
    # Find last space before max_length
    truncated = text[:max_length].rsplit(' ', 1)[0]
    return truncated + '...'

def generate_title_from_message(message: str) -> str:
    """
    Generate a conversation title from the first user message
    Uses simple heuristics
    """
    # Clean the message
    clean_msg = message.strip()
    
    # Common patterns and their replacements
    patterns = [
        (r'^(write|create|make|build|generate)\s+(a|an|some|the)?\s*', 'Create: '),
        (r'^(explain|tell me|what is|what are|describe)\s+', 'About: '),
        (r'^(how (do|to|can|does))\s+', 'How to: '),
        (r'^(help me|can you help|i need help)\s+', 'Help: '),
        (r'^(fix|debug|solve)\s+', 'Fix: '),
    ]
    
    for pattern, prefix in patterns:
        match = re.match(pattern, clean_msg, re.IGNORECASE)
        if match:
            # Remove the matched part and use the rest
            remaining = clean_msg[len(match.group(0)):]
            title = prefix + remaining
            return truncate_title(title, 45)
    
    # No pattern matched, just truncate
    return truncate_title(clean_msg, 50)

def generate_title_with_llm(model, tokenizer, message: str, response: str = None) -> str:
    """
    Use the LLM to generate a concise title (optional, more sophisticated)
    """
    prompt = f"""Generate a very short title (3-6 words) for this conversation:

User: {message[:200]}
{'Assistant: ' + response[:200] if response else ''}

Title (3-6 words):"""

    try:
        inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512)
        
        if hasattr(model, 'device'):
            inputs = {k: v.to(model.device) for k, v in inputs.items()}
        
        outputs = model.generate(
            **inputs,
            max_new_tokens=30,
            temperature=0.7,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id
        )
        
        title = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Extract just the title part
        if ':' in title:
            title = title.split(':', 1)[1].strip()
        
        # Clean up
        title = title.replace('\n', ' ').strip()
        title = re.sub(r'["\']', '', title)
        
        return truncate_title(title, 50)
    
    except Exception as e:
        print(f"LLM title generation failed: {e}")
        return generate_title_from_message(message)