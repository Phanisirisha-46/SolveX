import requests
import json

def verify_storage():
    url = "http://localhost:8000/chats"
    print(f"Querying {url}...")
    try:
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            chats = data.get("chats", [])
            print(f"Found {len(chats)} chats:")
            print(json.dumps(chats, indent=2))
        else:
            print(f"Failed: {response.status_code} {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    verify_storage()
