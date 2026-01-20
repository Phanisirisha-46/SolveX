import os
import dotenv
from fastapi.testclient import TestClient
from api import app

dotenv.load_dotenv()

# 1x1 White JPEG Pixel
SMALL_IMAGE_BASE64 = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="

def test_api_locally():
    print("Initializing TestClient...")
    client = TestClient(app)
    
    payload = {
        "input_text": "Describe this image",
        "model_provider": "google", # Using gemini
        "model_name": "gemini-1.5-flash",
        "image_data": SMALL_IMAGE_BASE64
    }
    
    print("Sending POST /api/chat with image...")
    try:
        response = client.post("/api/chat", json=payload)
        print(f"Status Code: {response.status_code}")
        if response.status_code != 200:
            print(f"Error Response: {response.text}")
        else:
            print("Success! Response previews:")
            data = response.json()
            print(f"Final Response: {data.get('response')[:100]}...")
            print(f"Steps count: {len(data.get('steps', []))}")
            
    except Exception as e:
        print(f"CLIENT EXCEPTION: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_api_locally()
