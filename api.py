from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from src.graph import app as graph_app
import sys
import uvicorn
import os

# Set encoding for Windows console
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

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

@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        print(f"Received request: {request.input_text} using {request.model_provider}")
        if request.image_data:
            print(f"Image Data Received. Size: {len(request.image_data)} chars")
        else:
            print("No Image Data Received.")
            
        inputs = {
            "input_text": request.input_text,
            "image_data": request.image_data
        }
        
        # Pass model config to the graph
        config = {
            "configurable": {
                "model_provider": request.model_provider,
                "model_name": request.model_name
            }
        }
        
        steps = []
        final_explanation = "No explanation generated."
        
        # Stream events to capture intermediate node outputs
        for output in graph_app.stream(inputs, config=config):
            for node_name, state in output.items():
                print(f"Node {node_name} finished.")
                
                step_info = {
                    "title": node_name.capitalize(),
                    "content": "",
                    "expanded": False
                }
                
                if node_name == "analyze_image":
                    if request.image_data:
                        step_info["title"] = "Analyzing Image"
                        step_info["content"] = "Image content successfully extracted."
                    else:
                        continue # Hide step if no image was actually processed
                elif node_name == "classify":
                    ptype = state.get('problem_type', 'Unknown').lower()
                    # Hide classification step if it triggered a guardrail
                    if "greeting" in ptype or "irrelevant" in ptype or "incomplete" in ptype:
                        continue
                    
                    step_info["title"] = "Classifying Problem"
                    step_info["content"] = f"Identified as: **{state.get('problem_type', 'Unknown')}**"
                elif node_name == "real_world":
                    step_info["title"] = "Real World Context"
                    step_info["content"] = state.get('real_world_context', '')
                elif node_name == "extract":
                    step_info["title"] = "Extracting Equations"
                    equations = state.get('equations', [])
                    # Formatting list for markdown display
                    eq_str = "\n".join([f"- {eq}" for eq in equations])
                    step_info["content"] = f"Extracted:\n{eq_str}"
                elif node_name == "solve":
                    step_info["title"] = "Solving Equations"
                    step_info["content"] = f"Solution found: {state.get('solution', 'N/A')}"
                elif node_name == "explain":
                    final_explanation = state.get('explanation', "No explanation.")
                    continue # specific handling for final output vs steps
                elif node_name == "guardrail":
                    # For guardrails, set the explanation and skip adding a timeline step
                    final_explanation = state.get('explanation', "I cannot answer this.")
                    continue
                elif node_name == "practice":
                    # Practice problems are usually returned as the final "answer" or appended.
                    # Let's append them to the final explanation or return as a step?
                    # User asked for "generate 2 problems... for the person to solve".
                    # Let's add it as a step "Practice Problems"
                    step_info["title"] = "Practice Problems"
                    problems = state.get('practice_problems', [])
                    prob_str = "\n".join([f"{i+1}. {p}" for i, p in enumerate(problems)])
                    step_info["content"] = f"Here are similar problems to try:\n\n{prob_str}"
                    step_info["content"] = f"Here are similar problems to try:\n\n{prob_str}"
                elif node_name == "resources":
                    step_info["title"] = "Related Resources"
                    # Expecting a bullet list from LLM
                    step_info["content"] = state.get('references', [''])[0]

                steps.append(step_info)
        
        # Store chat in Qdrant
        await store_chat(
            user_input=request.input_text, 
            bot_response=final_explanation,
            metadata={
                "model_provider": request.model_provider,
                "model_name": request.model_name
            }
        )

        return {
            "response": final_explanation,
            "steps": steps
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        with open("error.log", "w") as f:
            f.write(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

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

if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
