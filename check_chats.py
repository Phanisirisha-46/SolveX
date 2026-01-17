import os
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.http import models

load_dotenv()

def check_stored_chats():
    url = os.getenv("QDRANT_URL")
    api_key = os.getenv("QDRANT_API_KEY")
    
    if not url:
        print("Error: QDRANT_URL is not set.")
        return

    client = QdrantClient(url=url, api_key=api_key)
    collection_name = "chats"
    
    try:
        if not client.collection_exists(collection_name):
            print(f"Collection '{collection_name}' does not exist.")
            return

        # Scroll through points (get the first 10)
        result, _ = client.scroll(
            collection_name=collection_name,
            limit=10,
            with_payload=True,
            with_vectors=False
        )
        
        if not result:
            print("No chats found in the collection yet.")
        else:
            print(f"Found {len(result)} stored chats:")
            for point in result:
                payload = point.payload
                print("-" * 20)
                print(f"User: {payload.get('user_input')}")
                print(f"Bot: {payload.get('bot_response')}")
                print(f"Time: {payload.get('timestamp')}")
                
    except Exception as e:
        print(f"Error querying Qdrant: {e}")

if __name__ == "__main__":
    check_stored_chats()
