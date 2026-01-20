import os
import dotenv
from groq import Groq

dotenv.load_dotenv()

def list_models():
    try:
        client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
        models = client.models.list()
        print("Available Groq Models:")
        for m in models.data:
            print(f"- {m.id}")
            
    except Exception as e:
        print(f"Error listing models: {e}")

if __name__ == "__main__":
    list_models()
