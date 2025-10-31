# Basic integration test for LangChain, LangGraph, LlamaIndex with Qwen models

from langchain_huggingface import HuggingFaceHub  # For LangChain + HF
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain

from langgraph.graph import StateGraph, END
from typing import TypedDict, Annotated
import operator

from llama_index.core import VectorStoreIndex, SimpleDirectoryReader
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

# Load your Qwen model (adjust path if needed)
from src.models.model_loader import load_model  # Assuming your existing loader
llm = load_model('Qwen/Qwen2.5-3B-Instruct')  # Use your chat model

# --- LangChain Example: Simple Chain ---
prompt = PromptTemplate.from_template("Tell me a joke about {topic}.")
chain = LLMChain(llm=llm, prompt=prompt)
print("LangChain Test:", chain.run(topic="AI"))

# --- LangGraph Example: Simple Stateful Graph ---
class State(TypedDict):
    count: Annotated[int, operator.add]

def increment(state):
    return {"count": 1}

graph = StateGraph(State)
graph.add_node("increment", increment)
graph.add_edge("increment", END)
graph.set_entry_point("increment")
app = graph.compile()
print("LangGraph Test:", app.invoke({"count": 0}))

# --- LlamaIndex RAG Example ---
# Assume some test docs in data/test_docs/ (create if needed)
documents = SimpleDirectoryReader("data/test_docs").load_data()
embed_model = HuggingFaceEmbedding(model_name="Qwen/Qwen2.5-3B-Instruct")  # Use your model for embeddings
index = VectorStoreIndex.from_documents(documents, embed_model=embed_model)
query_engine = index.as_query_engine()
response = query_engine.query("What is in the documents?")
print("LlamaIndex RAG Test:", response)