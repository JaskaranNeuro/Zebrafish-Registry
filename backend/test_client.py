import requests
import sys
import json

def test_token(token):
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    # Test user endpoint
    try:
        response = requests.get('http://localhost:5000/api/user', headers=headers)
        print(f"User endpoint status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error testing user endpoint: {e}")
    
    # Test racks endpoint
    try:
        response = requests.get('http://localhost:5000/api/racks', headers=headers)
        print(f"Racks endpoint status: {response.status_code}")
        if response.status_code == 200:
            print(f"Found {len(response.json())} racks")
        else:
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error testing racks endpoint: {e}")

def login(username, password):
    try:
        response = requests.post(
            'http://localhost:5000/api/login',
            json={'username': username, 'password': password}
        )
        print(f"Login status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Login successful for user: {username}")
            print(f"User ID: {data.get('user_id')}")
            print(f"Role: {data.get('role')}")
            print(f"Facility: {json.dumps(data.get('facility'))}")
            return data.get('access_token')
        else:
            print(f"Login failed: {response.text}")
            return None
    except Exception as e:
        print(f"Login error: {e}")
        return None

if __name__ == "__main__":
    if len(sys.argv) > 2:
        # Login with provided credentials
        token = login(sys.argv[1], sys.argv[2])
        if token:
            print("\nTesting token...")
            test_token(token)
    elif len(sys.argv) > 1:
        # Test provided token
        test_token(sys.argv[1])
    else:
        print("Usage: python test_client.py [username] [password]")
        print("  or: python test_client.py [token]")