"""
LangChain Integration - Chains
Wraps your existing models with LangChain for advanced orchestration
"""

from typing import List, Tuple, Dict, Any

# LangChain 0.2+ prompt & message types
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.output_parsers import StrOutputParser

# Prefer the dedicated package over langchain_community (avoids deprecation warnings)
from langchain_huggingface import HuggingFacePipeline

# HF / Torch stack
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
import torch


class _DictReturningChain:
    """
    Tiny adapter to keep old `.invoke(...) -> {'text': str}` behavior
    while using new Runnable pipelines under the hood.
    """
    def __init__(self, runnable):
        self.runnable = runnable

    def invoke(self, inputs: Dict[str, Any]) -> Dict[str, str]:
        text = self.runnable.invoke(inputs)
        return {"text": text}


class QwenLangChain:
    """
    LangChain wrapper for your Qwen models
    Provides chains for chat and code generation
    """

    def __init__(self):
        self.instruct_llm = None
        self.coder_llm = None
        self.chat_chain = None
        self.code_chain = None

    def initialize(self):
        """Load models and create chains"""
        print("🔗 Initializing LangChain integration...")

        # -------------------------
        # Load Qwen Instruct model
        # -------------------------
        print("Loading Qwen Instruct...")
        instruct_model = AutoModelForCausalLM.from_pretrained(
            "Qwen/Qwen2.5-3B-Instruct",
            torch_dtype=torch.float16,
            device_map="auto",
            cache_dir="./model_cache",
        )
        instruct_tokenizer = AutoTokenizer.from_pretrained(
            "Qwen/Qwen2.5-3B-Instruct",
            cache_dir="./model_cache",
        )

        instruct_pipe = pipeline(
            task="text-generation",
            model=instruct_model,
            tokenizer=instruct_tokenizer,
            max_new_tokens=512,
            temperature=0.7,
            do_sample=True,
            top_p=0.9,
            return_full_text=False,  # prevents prompt echo
        )

        # Wrap in LangChain
        self.instruct_llm = HuggingFacePipeline(pipeline=instruct_pipe)

        # ----------------------
        # Load Qwen Coder model
        # ----------------------
        print("Loading Qwen Coder...")
        coder_model = AutoModelForCausalLM.from_pretrained(
            "Qwen/Qwen2.5-Coder-3B-Instruct",
            torch_dtype=torch.float16,
            device_map="auto",
            cache_dir="./model_cache",
        )
        coder_tokenizer = AutoTokenizer.from_pretrained(
            "Qwen/Qwen2.5-Coder-3B-Instruct",
            cache_dir="./model_cache",
        )

        coder_pipe = pipeline(
            task="text-generation",
            model=coder_model,
            tokenizer=coder_tokenizer,
            max_new_tokens=768,
            temperature=0.3,
            do_sample=True,
            top_p=0.95,
            return_full_text=False,  # prevents prompt echo
        )

        self.coder_llm = HuggingFacePipeline(pipeline=coder_pipe)

        # Create chains
        self._create_chains()

        print("✅ LangChain integration ready!")

    def _create_chains(self):
        """Create LangChain runnables for different tasks and adapt to dict-return."""

        # ----------------
        # Chat chain
        # ----------------
        chat_prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "You are a helpful AI assistant. Provide clear, concise, and accurate responses.\n"
                    "Be conversational and friendly while remaining professional.",
                ),
                MessagesPlaceholder(variable_name="chat_history"),
                ("human", "{input}"),
            ]
        )

        chat_runnable = chat_prompt | self.instruct_llm | StrOutputParser()
        self.chat_chain = _DictReturningChain(chat_runnable)

        # ----------------
        # Code generation
        # ----------------
        code_prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "You are an expert programmer. Generate clean, well-documented code.\n"
                    "Always include:\n"
                    "1. Clear variable names\n"
                    "2. Comments explaining logic\n"
                    "3. Error handling where appropriate\n"
                    "4. Type hints (for Python)\n\n"
                    "Language: {language}",
                ),
                ("human", "{input}"),
            ]
        )

        code_runnable = code_prompt | self.coder_llm | StrOutputParser()
        self.code_chain = _DictReturningChain(code_runnable)

    def chat(self, message: str, chat_history: List[Tuple[str, str]] = None) -> str:
        """
        Generate a chat response using LangChain
        Args:
            message: User's input message
            chat_history: List of previous messages [(role, content), ...]
        Returns:
            AI response string
        """
        if chat_history is None:
            chat_history = []

        # Convert chat history to LangChain message objects
        lc_history = []
        for role, content in chat_history:
            if role == "user":
                lc_history.append(HumanMessage(content=content))
            elif role == "assistant":
                lc_history.append(AIMessage(content=content))

        try:
            response = self.chat_chain.invoke({"input": message, "chat_history": lc_history})
            return response["text"]
        except Exception as e:
            print(f"❌ Chat chain error: {e}")
            return f"I encountered an error: {str(e)}"

    def generate_code(self, prompt: str, language: str = "python") -> str:
        """
        Generate code using LangChain
        """
        try:
            response = self.code_chain.invoke({"input": prompt, "language": language})
            return response["text"]
        except Exception as e:
            print(f"❌ Code chain error: {e}")
            return f"# Error generating code: {str(e)}"


# Global instance (initialized by app.py)
qwen_lc = QwenLangChain()


def get_chat_chain():
    """Get the chat chain instance"""
    return qwen_lc.chat_chain


def get_code_chain():
    """Get the code generation chain instance"""
    return qwen_lc.code_chain
