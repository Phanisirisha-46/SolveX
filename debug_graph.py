import sys
import os
from dotenv import load_dotenv

load_dotenv()

# Add project root
sys.path.append(os.getcwd())

from src.graph import app
from src.config import settings

def test_graph():
    print("Testing Graph Execution...")
    try:
        inputs = {"input_text": "Solve 2x + 5 = 15"}
        config = {
            "configurable": {
                "model_provider": "groq",
                "model_name": "llama-3.3-70b-versatile"
            }
        }
        
        print(f"Running graph with model: {config['configurable']['model_provider']}")
        
        for output in app.stream(inputs, config=config):
            for node_name, state in output.items():
                print(f"Node '{node_name}' completed.")
                if node_name == "resources":
                    print("Resources output:", state.get("references"))
                    
        print("Graph execution completed successfully.")
        
    except Exception as e:
        print(f"Graph Failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_graph()
