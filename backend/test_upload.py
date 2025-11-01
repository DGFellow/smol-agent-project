"""
Test file upload and RAG integration
"""

import requests
import os

# Adjust these
BASE_URL = "http://localhost:5001"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6IkRvbSIsImV4cCI6MTc2MjA2ODc5NywiaWF0IjoxNzYxOTgyMzk3fQ.DDsqEQgQE_27I9QBjnJs7WvnWy0GpJDTBMO5_BYiQIs"  # Get from login

def test_upload():
    """Test uploading a file"""
    
    # Create test file
    with open("test_doc.txt", "w") as f:
        f.write("""
AI Platform Technical Specifications

The platform uses the following technologies:
- LangChain for agent orchestration
- LangGraph for workflow management
- LlamaIndex for document retrieval
- ChromaDB for vector storage
- Qwen 2.5 3B models for inference

Key features:
1. Local-first architecture
2. No API keys required
3. Privacy-focused design
4. Modular sandbox system
""")
    
    # Upload file
    url = f"{BASE_URL}/api/upload"
    headers = {"Authorization": f"Bearer {TOKEN}"}
    
    with open("test_doc.txt", "rb") as f:
        files = {"file": f}
        response = requests.post(url, headers=headers, files=files)
    
    print("Upload response:", response.json())
    
    # Check stats
    stats_url = f"{BASE_URL}/api/rag/stats"
    stats_response = requests.get(stats_url, headers=headers)
    print("\nRAG Stats:", stats_response.json())
    
    # Clean up
    os.remove("test_doc.txt")


if __name__ == "__main__":
    test_upload()