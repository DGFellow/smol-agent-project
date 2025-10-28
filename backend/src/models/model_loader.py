import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from pathlib import Path

class ModelLoader:
    def __init__(self, cache_dir="./model_cache"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True)
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Using device: {self.device}")

    def _load(self, model_name: str):
        print(f"Loading {model_name}...")

        # Choose dtype/device map safely
        if self.device == "cuda":
            torch_dtype = torch.float16
            device_map = "auto"         # let HF place on GPU
        else:
            # On CPU, use bfloat16 if available, else float32
            torch_dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float32
            device_map = None           # load on CPU explicitly

        tokenizer = AutoTokenizer.from_pretrained(
            model_name,
            cache_dir=self.cache_dir,
            trust_remote_code=True,
        )

        model = AutoModelForCausalLM.from_pretrained(
            model_name,
            cache_dir=self.cache_dir,
            torch_dtype=torch_dtype,
            device_map=device_map,
            trust_remote_code=True,
            low_cpu_mem_usage=True,
        )

        # Ensure model placed correctly when device_map=None
        if device_map is None:
            model = model.to(self.device)

        model.eval()
        return model, tokenizer

    def load_qwen_instruct(self):
        """Load Qwen2.5-3B-Instruct model"""
        return self._load("Qwen/Qwen2.5-3B-Instruct")  # :contentReference[oaicite:0]{index=0}

    def load_qwen_coder(self):
        """Load Qwen2.5-Coder-3B-Instruct model"""
        return self._load("Qwen/Qwen2.5-Coder-3B-Instruct")  # :contentReference[oaicite:1]{index=1}
