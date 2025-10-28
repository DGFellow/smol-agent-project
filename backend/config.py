import os
from pathlib import Path

class Config:
    # Server config
    HOST = "0.0.0.0"
    PORT = 5000
    
    # Model config
    MODEL_CACHE_DIR = Path("./model_cache")
    MAX_TOKENS = 2048
    TEMPERATURE = 0.7
    
    # GPU config
    USE_GPU = True
    DEVICE = "cuda" if USE_GPU else "cpu"