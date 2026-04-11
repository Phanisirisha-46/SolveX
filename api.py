from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from src.graph import app as graph_app
import sys
import uvicorn
import os



from dotenv import load_dotenv
load_dotenv()

from contextlib import asynccontextmanager
from src.storage import init_qdrant, store_chat, get_qdrant_client

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_qdrant()
    yield
    # Shutdown

app = FastAPI(title="SolveX API", lifespan=lifespan)

# Configure CORS
origins = [
    "http://localhost:5173", # Vite default
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    input_text: str
    model_provider: str = "groq"
    model_name: str | None = None
    image_data: str | None = None # Base64 string

from fastapi.responses import StreamingResponse
import json

@app.post("/api/chat")
async def chat(request: ChatRequest):
    print(f"Received request: {request.input_text} using {request.model_provider}")
    
    inputs = {
        "input_text": request.input_text,
        "image_data": request.image_data
    }
    
    # --- GPT COMPARE MANIPULATION ---
    if request.model_provider == "gpt-compare":
        from src.model_factory import LLMFactory
        import asyncio
        async def real_gpt_generator():
            try:
                # Use Groq LLaMA-3.3 to reliably generate a massive, fully detailed mathematical proof identically mirroring ChatGPT for any question!
                llm = LLMFactory.get_llm("groq-llama3.3")
                messages = [("user", request.input_text)]
                
                final_text = ""
                async for chunk in llm.astream(messages):
                    if chunk.content:
                        final_text += chunk.content
                        yield json.dumps({"type": "token", "content": chunk.content}) + "\n"
                
                # Store the ChatGPT response inside Qdrant
                from src.storage import store_chat
                await store_chat(
                    user_input=request.input_text,
                    bot_response=final_text,
                    metadata={"model_provider": request.model_provider, "model_name": "ChatGPT Proxy"}
                )
                        
                yield json.dumps({"type": "done"}) + "\n"
            except Exception as e:
                yield json.dumps({"type": "error", "message": "Demo connection error: " + str(e)}) + "\n"
            
        return StreamingResponse(real_gpt_generator(), media_type="application/x-ndjson")
    # --------------------------------

    config = {
        "configurable": {
            "model_provider": request.model_provider,
            "model_name": request.model_name
        }
    }

    async def event_generator():
        final_answer_accumulator = ""
        
        try:
            # Use astream_events to capture detailed events including tokens
            async for event in graph_app.astream_events(inputs, config=config, version="v1"):
                # Safety check: Ensure event is a dictionary
                if not isinstance(event, dict):
                    continue
                    
                kind = event.get("event")
                metadata = event.get("metadata", {})
                node_name = metadata.get("langgraph_node", "") if isinstance(metadata, dict) else ""
                
                # 1. STREAM TOKENS (Line-by-line / Token-by-token effect)
                # Only stream tokens for the 'explain' node which provides the main answer
                if kind == "on_chat_model_stream" and node_name == "explain":
                    data = event.get("data", {})
                    chunk = data.get("chunk")
                    # Handle AIMessageChunk object or dict
                    content = ""
                    if hasattr(chunk, "content"):
                        content = chunk.content
                    elif isinstance(chunk, dict):
                        content = chunk.get("content", "")
                    
                    if content:
                        final_answer_accumulator += content
                        yield json.dumps({"type": "token", "content": content}) + "\n"

                # 2. CAPTURE STEPS (Thinking Process)
                # Trigger when a node finishes (chain_end) and it's one of our graph nodes
                elif kind == "on_chain_end" and node_name in ["analyze_image", "classify", "real_world", "extract", "solve", "practice", "resources", "guardrail"]:
                    data = event.get("data", {})
                    output = data.get("output")
                    
                    # Ensure output is a dictionary before accessing fields
                    if not isinstance(output, dict):
                         continue

                    step_data = None
                    
                    if node_name == "analyze_image":
                        if request.image_data:
                            step_data = {"title": "Analyzing Image", "content": "Image content extracted."}
                    
                    elif node_name == "classify":
                        ptype = output.get('problem_type', 'Unknown')
                        # Skip guardrail triggers here, handled in guardrail node? 
                        # Actually guardrail node runs separately.
                        step_data = {
                            "title": "Classifying Problem", 
                            "content": f"Identified as: **{ptype}**",
                            "category": ptype,
                        }
                        
                    elif node_name == "real_world":
                        step_data = {"title": "Real World Context", "content": output.get('real_world_context', '')}
                        
                    elif node_name == "extract":
                        eqs = output.get('equations', [])
                        eq_str = "\n".join([f"- {eq}" for eq in eqs])
                        step_data = {"title": "Extracting Equations", "content": f"Extracted:\n{eq_str}"}
                        
                    elif node_name == "solve":
                        step_data = {"title": "Solving Equations", "content": f"Solution found: {output.get('solution', 'N/A')}"}
                        
                    elif node_name == "practice":
                        probs = output.get('practice_problems', [])
                        prob_str = "\n".join([f"{i+1}. {p}" for i, p in enumerate(probs)])
                        step_data = {"title": "Practice Problems", "content": f"Here are similar problems to try:\n\n{prob_str}"}
                        
                    elif node_name == "resources":
                         refs = output.get('references', [''])
                         step_data = {"title": "Related Resources", "content": refs[0] if refs else ""}

                    elif node_name == "guardrail":
                        # If guardrail triggers, it replaces everything.
                        # We might need to send this as a massive token chunk or a special event?
                        # For simplicity, let's just append it to token stream if it wasn't streamed.
                        explanation = output.get('explanation', '')
                        # If we haven't streamed anything yet (likely, as explain logic didn't run), stream this now.
                        if not final_answer_accumulator:
                            final_answer_accumulator += explanation
                            yield json.dumps({"type": "token", "content": explanation}) + "\n"

                    if step_data:
                        yield json.dumps({"type": "step", "data": step_data}) + "\n"

            # 3. DONE
            # Store chat history before finishing
            if final_answer_accumulator:
                 await store_chat(
                    user_input=request.input_text, 
                    bot_response=final_answer_accumulator,
                    metadata={
                        "model_provider": request.model_provider,
                        "model_name": request.model_name
                    }
                )
            yield json.dumps({"type": "done"}) + "\n"

        except Exception as e:
            import traceback
            traceback.print_exc()
            yield json.dumps({"type": "error", "message": str(e)}) + "\n"

    return StreamingResponse(event_generator(), media_type="application/x-ndjson")

@app.get("/api/chats")
async def get_chats():
    try:
        client = get_qdrant_client()
        result, _ = client.scroll(
            collection_name="chats",
            limit=50,
            with_payload=True,
            with_vectors=False
        )
        return {"chats": [point.payload for point in result]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/test-vision")
async def test_vision():
    try:
        if not os.getenv("GROQ_API_KEY"):
            return {"status": "error", "message": "GROQ_API_KEY missing"}
            
        from src.model_factory import LLMFactory
        # Just try to instantiate, don't invoke to save cost/latency
        llm = LLMFactory.get_vision_model()
        return {"status": "ok", "message": "Vision model loaded", "model_type": str(type(llm))}
        
    except Exception as e:
        import traceback
        return {"status": "error", "message": str(e), "trace": traceback.format_exc()}

# Validates Stats Update Request
class StatsUpdateRequest(BaseModel):
    model: str
    category: str
    event_type: str # init, compliance, vote
    value: bool | None # true/false or None for init

from src.storage import save_stats_event, get_aggregated_stats

@app.get("/api/stats")
async def get_stats():
    """Fetches aggregated stats from Qdrant."""
    return get_aggregated_stats()

@app.post("/api/stats/vote")
async def save_vote(request: StatsUpdateRequest):
    """Saves a stats event (vote, compliance, or init) to Qdrant."""
    save_stats_event(request.model, request.category, request.event_type, request.value)
    return {"status": "success"}
    
if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
