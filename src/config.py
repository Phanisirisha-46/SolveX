import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    OPENAI_API_KEY: str | None = os.getenv("OPENAI_API_KEY")
    GOOGLE_API_KEY: str | None = os.getenv("GOOGLE_API_KEY")
    DEFAULT_LLM: str = os.getenv("DEFAULT_LLM", "openai").lower()

    class Config:
        env_file = ".env"

settings = Settings()
