import os
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.http import models

load_dotenv()

def verify_qdrant():
    url = os.getenv("QDRANT_URL")
    api_key = os.getenv("QDRANT_API_KEY")
    
    if not url:
        print("Error: QDRANT_URL is not set.")
        return

    print(f"Connecting to Qdrant at {url}...")
    try:
        client = QdrantClient(url=url, api_key=api_key)
        collections = client.get_collections()
        print(f"Successfully connected. Collections: {collections}")
        
        # Test collection creation
        test_col = "test_verification"
        if not client.collection_exists(test_col):
            client.create_collection(
                collection_name=test_col,
                vectors_config=models.VectorParams(size=4, distance=models.Distance.DOT)
            )
            print(f"Created test collection '{test_col}'")
        
        client.delete_collection(test_col)
        print(f"Deleted test collection '{test_col}'")
        print("Verification successful!")
        
    except Exception as e:
        print(f"Verification failed: {e}")

if __name__ == "__main__":
    verify_qdrant()
