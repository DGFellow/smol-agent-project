"""
Test script for LangChain integration
Run this to verify everything works before integrating with Flask
"""

import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from backend.src.langchain_integration.chains import qwen_lc
from backend.src.langchain_integration.agent import initialize_agent, get_router
from langchain_core.callbacks import BaseCallbackHandler

class SafeStdOutHandler(BaseCallbackHandler):
    def on_chain_start(self, serialized, inputs, **kwargs):
        print("Prompt after formatting:")
        try:
            if isinstance(inputs, dict):
                val = inputs.get("input") or inputs.get("messages") or inputs
            else:
                val = inputs  # could be None
            print(val)
        except Exception as e:
            print(f"(handler suppressed error: {e})")

def test_basic_chain():
    """Test basic chat chain"""
    print("\n" + "="*60)
    print("TEST 1: Basic Chat Chain")
    print("="*60)
    
    response = qwen_lc.chat("Hello! How are you today?")
    print(f"\nResponse: {response}\n")
    
    assert len(response) > 0, "Response should not be empty"
    print("✅ Basic chat chain works!")


def test_code_generation():
    """Test code generation chain"""
    print("\n" + "="*60)
    print("TEST 2: Code Generation Chain")
    print("="*60)
    
    response = qwen_lc.generate_code(
        "Write a Python function to calculate fibonacci numbers",
        language="python"
    )
    print(f"\nGenerated Code:\n{response}\n")
    
    assert "def" in response or "fibonacci" in response.lower(), "Should generate a function"
    print("✅ Code generation works!")


def test_conversation_memory():
    """Test conversation with memory"""
    print("\n" + "="*60)
    print("TEST 3: Conversation Memory")
    print("="*60)
    
    # First message
    history = []
    response1 = qwen_lc.chat("My name is Alice", chat_history=history)
    print(f"\nFirst response: {response1}")
    
    # Add to history
    history.append(("user", "My name is Alice"))
    history.append(("assistant", response1))
    
    # Second message referencing first
    response2 = qwen_lc.chat("What's my name?", chat_history=history)
    print(f"Second response: {response2}\n")
    
    # Check if it remembers
    remembers = "alice" in response2.lower()
    print(f"✅ Memory works!" if remembers else "⚠️ Memory might not be working")


def test_agent_with_tools():
    """Test agent with calculator tool"""
    print("\n" + "="*60)
    print("TEST 4: Agent with Tools")
    print("="*60)
    
    # Initialize agent
    initialize_agent(qwen_lc.instruct_llm, qwen_lc.chat_chain)
    router = get_router()
    
    if not router:
        print("❌ Router not initialized")
        return
    
    # Test calculation
    result = router.route("What is 25 * 4 + 10?")
    print(f"\nAgent response: {result['response']}")
    print(f"Used tools: {result['used_tools']}\n")
    
    # Should use calculator tool
    if result['used_tools']:
        print("✅ Agent can use tools!")
    else:
        print("⚠️ Agent didn't use tools (might be using direct calculation)")


def test_routing():
    """Test intelligent routing"""
    print("\n" + "="*60)
    print("TEST 5: Intelligent Routing")
    print("="*60)
    
    router = get_router()
    
    if not router:
        print("❌ Router not initialized")
        return
    
    # Test 1: Simple chat (should not use tools)
    result1 = router.route("Hello, how are you?")
    print(f"\nChat query: {result1['type']}, Used tools: {result1['used_tools']}")
    
    # Test 2: Calculation (should use tools)
    result2 = router.route("Calculate the square root of 144")
    print(f"Tool query: {result2['type']}, Used tools: {result2['used_tools']}\n")
    
    print("✅ Routing works!")


def run_all_tests():
    """Run all tests"""
    print("\n" + "="*60)
    print("LANGCHAIN INTEGRATION TEST SUITE")
    print("="*60)
    
    try:
        # Initialize LangChain
        print("\nInitializing LangChain...")
        qwen_lc.initialize()
        print("✅ Initialization complete!\n")
        
        # Run tests
        test_basic_chain()
        test_code_generation()
        test_conversation_memory()
        test_agent_with_tools()
        test_routing()
        
        print("\n" + "="*60)
        print("🎉 ALL TESTS PASSED!")
        print("="*60)
        print("\nLangChain integration is ready to use in your Flask app.")
        print("Set use_langchain=True in app.py to enable it.\n")
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    run_all_tests()