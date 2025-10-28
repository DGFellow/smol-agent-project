import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from pathlib import Path
import os

class ModelLoader:
    def __init__(self, cache_dir="./model_cache"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True)
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Using device: {self.device}")
        
    def load_qwen_instruct(self):
        """Load Qwen2.5-3B-Instruct model"""
        model_name = "Qwen/Qwen2.5-3B-Instruct"
        print(f"Loading {model_name}...")
        
        tokenizer = AutoTokenizer.from_pretrained(
            model_name,
            cache_dir=self.cache_dir,
            trust_remote_code=True
        )
        
        model = AutoModelForCausalLM.from_pretrained(
            model_name,
            cache_dir=self.cache_dir,
            torch_dtype=torch.float16,
            device_map="auto",
            trust_remote_code=True
        )
        
        return model, tokenizer
    
    def load_qwen_coder(self):
        """Load Qwen2.5-Coder-3B-Instruct model"""
        model_name = "Qwen/Qwen2.5-Coder-3B-Instruct"
        print(f"Loading {model_name}...")
        
        tokenizer = AutoTokenizer.from_pretrained(
            model_name,
            cache_dir=self.cache_dir,
            trust_remote_code=True
        )
        
        model = AutoModelForCausalLM.from_pretrained(
            model_name,
            cache_dir=self.cache_dir,
            torch_dtype=torch.float16,
            device_map="auto",
            trust_remote_code=True
        )
        
        return model, tokenizer