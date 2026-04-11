import os
import time
import uuid
from typing import Dict, Any, Optional
try:
    from qdrant_client import QdrantClient
    from qdrant_client.http import models
    HAS_QDRANT = True
except ImportError:
    HAS_QDRANT = False
    print("WARNING: 'qdrant-client' not installed. Persistence disabled.")
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from dotenv import load_dotenv

load_dotenv()

# Initialize Qdrant Client
_client = None
_collection_name = "chats"
_votes_collection_name = "votes"

def get_qdrant_client():
    global _client
    if not HAS_QDRANT:
        return None
        
    if _client is None:
        url = os.getenv("QDRANT_URL")
        api_key = os.getenv("QDRANT_API_KEY")
        
        if not url:
            print("QDRANT_URL not set in environment variables.")
            return None
            
        try:
            # Short timeout to prevent hanging the chat if DB is down
            _client = QdrantClient(url=url, api_key=api_key, timeout=2.0)
            # Verify connection
            _client.get_collections()
        except Exception as e:
            print(f"WARNING: Qdrant Connection Failed. Persistence Disabled (Cloud Mode). Error: {e}")
            _client = None
            return None
    return _client

def init_qdrant():
    """Initializes the Qdrant collections if they don't exist."""
    client = get_qdrant_client()
    if not client:
        return

    try:
        # 1. Chat History Collection
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
        
        # 2. Votes/Stats Collection (Dummy Vector)
        if not client.collection_exists(_votes_collection_name):
            print(f"Creating collection {_votes_collection_name} with size 1...")
            client.create_collection(
                collection_name=_votes_collection_name,
                vectors_config=models.VectorParams(
                    size=1,  # Dummy vector size
                    distance=models.Distance.DOT
                )
            )
            print(f"Collection '{_votes_collection_name}' created.")

    except Exception as e:
        print(f"Error initializing Qdrant: {e}")

async def store_chat(user_input: str, bot_response: str, metadata: Optional[Dict[str, Any]] = None):
    """Stores the chat interaction in Qdrant."""
    print(f"DEBUG: Attempting to store chat: '{user_input[:20]}...'")
    client = get_qdrant_client()
    if not client:
        return

    try:
        api_key = os.getenv("GOOGLE_API_KEY")
        vector = None
        if api_key:
            try:
                embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004", google_api_key=api_key)
                vector = await embeddings.aembed_query(user_input)
            except Exception as e:
                print(f"Embedding generation failed: {e}. Falling back to zero vector.")
        
        # If API key missing or quota exhausted, strictly insert dummy vector to guarantee persistence
        if not vector:
            vector = [0.0] * 768
            
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
        client.upsert(
            collection_name=_collection_name,
            points=[point],
            wait=True
        )
        print(f"SUCCESS: Chat stored in Qdrant with ID {point_id}")
    except Exception as e:
        print(f"ERROR in store_chat: {e}")

def save_stats_event(model: str, category: str, event_type: str, value: Any):
    """
    Stores a stats event in Qdrant.
    event_type: 'init' (generation start), 'compliance' (bool), 'vote' (up/down/bool)
    """
    client = get_qdrant_client()
    if not client: return

    try:
        point_id = str(uuid.uuid4())
        payload = {
            "model": model,
            "category": category,
            "event_type": event_type,
            "value": value,
            "timestamp": time.time()
        }
        
        # Dummy vector since we are doing payload filtering mainly
        vector = [0.0] 

        client.upsert(
            collection_name=_votes_collection_name,
            points=[models.PointStruct(id=point_id, vector=vector, payload=payload)],
            wait=True
        )
        print(f"Stats saved: {model} {category} {event_type}")
    except Exception as e:
        print(f"Error saving stats: {e}")

def get_aggregated_stats():
    """
    Aggregates stats from Qdrant by scrolling all points.
    Returns format compatible with frontend modelStats.
    """
    client = get_qdrant_client()
    if not client: return {}

    try:
        # Scroll all points (limit to 10k for now)
        # For production, we would iterate using offset
        response = client.scroll(
            collection_name=_votes_collection_name,
            limit=10000,
            with_payload=True,
            with_vectors=False
        )
        points, _ = response
        
        stats = {}

        for p in points:
            pl = p.payload
            model = pl.get('model')
            cat = pl.get('category')
            etype = pl.get('event_type')
            val = pl.get('value')

            if not model or not cat: continue

            if model not in stats: stats[model] = {}
            if cat not in stats[model]: stats[model][cat] = {'total': 0, 'likes': 0, 'compliance': 0}

            if etype == 'init':
                stats[model][cat]['total'] += 1
            elif etype == 'vote' and val is True: # True = Upvote
                 stats[model][cat]['likes'] += 1
            elif etype == 'compliance' and val is True: # True = Passed
                 stats[model][cat]['compliance'] += 1
        
        return stats

    except Exception as e:
        print(f"Error getting stats: {e}")
        return {}
