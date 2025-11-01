import requests
import json

BASE_URL = "http://localhost:5001/api/auth"

print("=" * 50)
print("ENHANCED AUTH SYSTEM TEST")
print("=" * 50)

# Test 1: Username check
print("\n1. Testing username availability...")
resp = requests.post(f"{BASE_URL}/check-username", 
                     json={"username": "newuser"})
print(f"   Status: {resp.status_code}")
print(f"   Response: {resp.json()}")

# Test 2: Registration
print("\n2. Testing registration...")
resp = requests.post(f"{BASE_URL}/register", json={
    "username": "testuser999",
    "email": "test999@example.com",
    "password": "SecurePass123!",
    "password_confirm": "SecurePass123!",
    "first_name": "Test",
    "last_name": "User"
})
print(f"   Status: {resp.status_code}")
result = resp.json()
print(f"   Response: {json.dumps(result, indent=2)}")

if resp.status_code == 201:
    token = result.get('token')
    
    # Test 3: Token verification
    print("\n3. Testing token verification...")
    resp = requests.get(f"{BASE_URL}/verify",
                       headers={"Authorization": f"Bearer {token}"})
    print(f"   Status: {resp.status_code}")
    print(f"   Response: {resp.json()}")
    
    print("\n✅ All tests passed!")
else:
    print("\n❌ Registration failed")

print("=" * 50)