import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

api_key = os.environ.get("GROQ_API_KEY")
if not api_key:
    print("GROQ_API_KEY not found in .env")
    exit(1)

client = Groq(api_key=api_key)

try:
    print(f"Checking models with key: {api_key[:5]}...")
    models = client.models.list()
    print("Available Groq Models:")
    for m in models.data:
        print(f"- {m.id}")
except Exception as e:
    print(f"Error accessing Groq API: {e}")
