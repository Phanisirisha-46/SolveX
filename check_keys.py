import os
from dotenv import load_dotenv

load_dotenv()

def check_keys():
    print(f"GOOGLE_API_KEY present: {bool(os.getenv('GOOGLE_API_KEY'))}")
    print(f"GROQ_API_KEY present: {bool(os.getenv('GROQ_API_KEY'))}")
    print(f"OPENAI_API_KEY present: {bool(os.getenv('OPENAI_API_KEY'))}")

if __name__ == "__main__":
    check_keys()
