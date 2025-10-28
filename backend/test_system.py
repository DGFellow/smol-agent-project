"""
Test script to verify all components are working
"""
import requests
import json
from colorama import init, Fore, Style
init(autoreset=True)

BASE_URL = "http://localhost:5001"

def print_test(name, passed):
    """Print test result"""
    status = f"{Fore.GREEN}✓ PASS" if passed else f"{Fore.RED}✗ FAIL"
    print(f"{status}{Style.RESET_ALL} - {name}")

def test_health():
    """Test health endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/api/health")
        passed = response.status_code == 200 and response.json().get("status") == "healthy"
        print_test("Health Check", passed)
        if passed:
            data = response.json()
            print(f"  Models: {data.get('models')}")
            print(f"  Agents: {data.get('agents')}")
        return passed
    except Exception as e:
        print_test("Health Check", False)
        print(f"  Error: {e}")
        return False

def test_chat():
    """Test chat endpoint"""
    try:
        response = requests.post(
            f"{BASE_URL}/api/message",
            json={
                "message": "What is 2+2?",
                "session_id": "test_session"
            }
        )
        passed = response.status_code == 200
        print_test("Chat Request", passed)
        if passed:
            data = response.json()
            print(f"  Response length: {len(data.get('response', ''))} chars")
        return passed
    except Exception as e:
        print_test("Chat Request", False)
        print(f"  Error: {e}")
        return False

def test_code():
    """Test code generation"""
    try:
        response = requests.post(
            f"{BASE_URL}/api/message",
            json={
                "message": "Write a Python function to add two numbers",
                "session_id": "test_session"
            }
        )
        passed = response.status_code == 200 and "```" in response.json().get("response", "")
        print_test("Code Generation", passed)
        return passed
    except Exception as e:
        print_test("Code Generation", False)
        print(f"  Error: {e}")
        return False

def test_stats():
    """Test stats endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/api/stats")
        passed = response.status_code == 200
        print_test("Statistics", passed)
        if passed:
            data = response.json()
            print(f"  Total requests: {data.get('total_requests')}")
            print(f"  Avg response time: {data.get('avg_response_time_ms')}ms")
        return passed
    except Exception as e:
        print_test("Statistics", False)
        print(f"  Error: {e}")
        return False

def test_clear():
    """Test clear endpoint"""
    try:
        response = requests.post(
            f"{BASE_URL}/api/clear",
            json={"session_id": "test_session"}
        )
        passed = response.status_code == 200
        print_test("Clear History", passed)
        return passed
    except Exception as e:
        print_test("Clear History", False)
        print(f"  Error: {e}")
        return False

if __name__ == "__main__":
    print(f"\n{Fore.CYAN}{'='*50}")
    print(f"  Smolagent System Test Suite")
    print(f"{'='*50}{Style.RESET_ALL}\n")
    
    print(f"{Fore.YELLOW}Testing Backend...{Style.RESET_ALL}\n")
    
    tests = [
        test_health,
        test_chat,
        test_code,
        test_stats,
        test_clear
    ]
    
    passed = sum(test() for test in tests)
    total = len(tests)
    
    print(f"\n{Fore.CYAN}{'='*50}")
    print(f"  Results: {passed}/{total} tests passed")
    print(f"{'='*50}{Style.RESET_ALL}\n")
    
    if passed == total:
        print(f"{Fore.GREEN}All tests passed! ✓{Style.RESET_ALL}\n")
    else:
        print(f"{Fore.RED}Some tests failed. Check errors above.{Style.RESET_ALL}\n")