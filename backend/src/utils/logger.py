"""
Simple logging utility
"""
import logging
from datetime import datetime
from pathlib import Path

class AgentLogger:
    """Logger for agent activities"""
    
    def __init__(self, log_dir="logs"):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(exist_ok=True)
        
        # Setup logger
        self.logger = logging.getLogger('smolagent')
        self.logger.setLevel(logging.INFO)
        
        # File handler
        log_file = self.log_dir / f"agent_{datetime.now().strftime('%Y%m%d')}.log"
        fh = logging.FileHandler(log_file)
        fh.setLevel(logging.INFO)
        
        # Console handler
        ch = logging.StreamHandler()
        ch.setLevel(logging.INFO)
        
        # Formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        fh.setFormatter(formatter)
        ch.setFormatter(formatter)
        
        self.logger.addHandler(fh)
        self.logger.addHandler(ch)
    
    def log_request(self, message: str, agent_type: str, session_id: str):
        """Log incoming request"""
        self.logger.info(f"[{session_id}] Request to {agent_type}: {message[:100]}...")
    
    def log_response(self, response: str, agent_type: str, session_id: str):
        """Log agent response"""
        self.logger.info(f"[{session_id}] Response from {agent_type}: {len(response)} chars")
    
    def log_error(self, error: str, session_id: str):
        """Log error"""
        self.logger.error(f"[{session_id}] Error: {error}")