import os

from dotenv import load_dotenv

load_dotenv()

class Settings:
    def __init__(self):
        self.GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
        self.GROQ_API_KEY = os.getenv("GROQ_API_KEY")
        self.DEFAULT_LLM = os.getenv("DEFAULT_LLM", "groq").lower()
        self.QDRANT_URL = os.getenv("QDRANT_URL")
        self.QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
        self.OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
        self.ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

settings = Settings()
