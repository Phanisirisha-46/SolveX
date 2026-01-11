from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from src.graph import app as graph_app
import uvicorn
import os

app = FastAPI(title="SolveX API")

# Configure CORS
origins = [
    "http://localhost:5173", # Vite default
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    input_text: str

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        print(f"Received request: {request.input_text}")
        inputs = {"input_text": request.input_text}
        
        steps = []
        final_explanation = "No explanation generated."
        
        # Stream events to capture intermediate node outputs
        for output in graph_app.stream(inputs):
            for node_name, state in output.items():
                print(f"Node {node_name} finished.")
                
                step_info = {
                    "title": node_name.capitalize(),
                    "content": "",
                    "expanded": False
                }
                
                if node_name == "classify":
                    step_info["title"] = "Classifying Problem"
                    step_info["content"] = f"Identified as: **{state.get('problem_type', 'Unknown')}**"
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

                steps.append(step_info)

        return {
            "response": final_explanation,
            "steps": steps
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
