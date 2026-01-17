import os
import time
import uuid
from typing import Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.http import models
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from dotenv import load_dotenv

load_dotenv()

# Initialize Qdrant Client
_client = None
_collection_name = "chats"

def get_qdrant_client():
    global _client
    if _client is None:
        url = os.getenv("QDRANT_URL")
        api_key = os.getenv("QDRANT_API_KEY")
        
        if not url:
            print("QDRANT_URL not set in environment variables.")
            return None
            
        try:
            _client = QdrantClient(url=url, api_key=api_key)
        except Exception as e:
            print(f"Failed to connect to Qdrant: {e}")
            return None
    return _client

def init_qdrant():
    """Initializes the Qdrant collection if it doesn't exist."""
    client = get_qdrant_client()
    if not client:
        return

    try:
        if not client.collection_exists(_collection_name):
            print(f"Creating collection {_collection_name} with size 768...")
            client.create_collection(
                collection_name=_collection_name,
                vectors_config=models.VectorParams(
                    size=768,  # Google embedding-001 size
                    distance=models.Distance.COSINE
                )
            )
            print(f"Collection '{_collection_name}' created.")
        else:
            # Check dimensions if possible, or just print existence
            # For simplicity in this fix, we will assume if it exists it might be wrong if created with OpenAI
            # So we will try to get info, and if wrong, recreate.
            try:
                info = client.get_collection(_collection_name)
                if info.config.params.vectors.size != 768:
                    print(f"Collection '{_collection_name}' has wrong dimensions ({info.config.params.vectors.size}). Recreating...")
                    client.delete_collection(_collection_name)
                    client.create_collection(
                        collection_name=_collection_name,
                        vectors_config=models.VectorParams(
                            size=768,
                            distance=models.Distance.COSINE
                        )
                    )
            except Exception as e:
                print(f"Error checking collection info: {e}")
            
            print(f"Collection '{_collection_name}' ready.")
    except Exception as e:
        print(f"Error initializing Qdrant: {e}")

async def store_chat(user_input: str, bot_response: str, metadata: Optional[Dict[str, Any]] = None):
    """Stores the chat interaction in Qdrant."""
    print(f"DEBUG: Attempting to store chat: '{user_input[:20]}...'")
    client = get_qdrant_client()
    if not client:
        print("DEBUG: No Qdrant client available.")
        return

    try:
        print("DEBUG: Generating embeddings...")
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
             print("ERROR: GOOGLE_API_KEY not found in environment.")
        
        embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004", google_api_key=api_key)
        vector = await embeddings.aembed_query(user_input)
        print("DEBUG: Embeddings generated successfully.")
        
        payload = {
            "user_input": user_input,
            "bot_response": bot_response,
            "timestamp": time.time()
        }
        if metadata:
            payload.update(metadata)

        point_id = str(uuid.uuid4())
        point = models.PointStruct(
            id=point_id, 
            vector=vector,
            payload=payload
        )
        print(f"DEBUG: Upserting to collection '{_collection_name}'...")
        client.upsert(
            collection_name=_collection_name,
            points=[point],
            wait=True
        )
        print(f"SUCCESS: Chat stored in Qdrant with ID {point_id}")
    except Exception as e:
        print(f"ERROR in store_chat: {e}")
        import traceback
        traceback.print_exc()
        with open("storage_error.log", "w") as f:
            f.write(traceback.format_exc())
