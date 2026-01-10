from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from src.config import settings

class LLMFactory:
    @staticmethod
    def get_llm(provider: str = None, model_name: str = None):
        provider = provider or settings.DEFAULT_LLM
        
        if provider == "openai":
            return ChatOpenAI(
                model=model_name or "gpt-4-turbo",
                api_key=settings.OPENAI_API_KEY,
                temperature=0
            )
        elif provider == "gemini":
            return ChatGoogleGenerativeAI(
                model=model_name or "gemini-1.5-pro",
                google_api_key=settings.GOOGLE_API_KEY,
                temperature=0,
                convert_system_message_to_human=True 
            )
        else:
            raise ValueError(f"Unsupported LLM provider: {provider}")
