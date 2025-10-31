# Basic integration test for LangChain, LangGraph, LlamaIndex with Qwen models

from langchain_huggingface import HuggingFacePipeline
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain

from langgraph.graph import StateGraph, END
from typing import TypedDict, Annotated
import operator

from llama_index.core import VectorStoreIndex, SimpleDirectoryReader
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

# Load your Qwen model and tokenizer (adjust if load_model returns something else)
from transformers import AutoTokenizer, pipeline
from src.models.model_loader import load_model

model_path = 'Qwen/Qwen2.5-3B-Instruct'  # Matches your cache
model = load_model(model_path)
tokenizer = AutoTokenizer.from_pretrained(model_path)

# Wrap in transformers pipeline for LangChain
pipe = pipeline(
    "text-generation",
    model=model,
    tokenizer=tokenizer,
    max_new_tokens=100,
    temperature=0.7
)
llm = HuggingFacePipeline(pipeline=pipe)

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
documents = SimpleDirectoryReader("data/test_docs").load_data()
embed_model = HuggingFaceEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")  # Proper embedding model
index = VectorStoreIndex.from_documents(documents, embed_model=embed_model)
query_engine = index.as_query_engine()
response = query_engine.query("What is in the documents?")
print("LlamaIndex RAG Test:", response)