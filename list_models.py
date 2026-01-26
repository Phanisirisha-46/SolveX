
import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

genai.configure(api_key=api_key)

with open("models_clean.txt", "w", encoding="utf-8") as f:
    try:
        for m in genai.list_models():
            f.write(f"Name: {m.name}\n")
    except Exception as e:
        f.write(f"Error: {e}\n")
