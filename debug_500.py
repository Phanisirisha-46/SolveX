import os
import dotenv
from src.graph import workflow
from src.config import settings

dotenv.load_dotenv()

print("Testing Text-Only Input...")
try:
    inputs = {
        "input_text": "What is 2+2?",
        "problem_type": "unknown",
        "real_world_context": "",
        "equations": [],
        "solution": "",
        "explanation": "",
        "practice_problems": [],
        "references": [],
        "image_data": None
    }
    
    app = workflow.compile()
    result = app.invoke(inputs)
    print("Success!")
    print(result.get("solution", "No solution"))

except Exception as e:
    print(f"CRASHED: {e}")
    import traceback
    traceback.print_exc()
