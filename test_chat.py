import requests
import json

def test_chat():
    url = "http://localhost:8000/chat"
    payload = {
        "input_text": "What is 2+2?",
        "model_provider": "groq"
    }
    try:
        print(f"Sending request to {url}...")
        response = requests.post(url, json=payload)
        response.raise_for_status()
        print("Response received:")
        print(json.dumps(response.json(), indent=2))
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_chat()
