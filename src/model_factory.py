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
                model=model_name or "gemini-flash-latest",
                google_api_key=settings.GOOGLE_API_KEY,
                temperature=0,
                convert_system_message_to_human=True 
            )
        elif provider == "anthropic":
            from langchain_anthropic import ChatAnthropic
            return ChatAnthropic(
                model=model_name or "claude-3-5-sonnet-20240620",
                api_key=settings.ANTHROPIC_API_KEY,
                temperature=0
            )
        elif provider.startswith("groq"):
            # Map frontend IDs to actual Groq model names
            model_map = {
                "groq-llama3.3": "llama-3.3-70b-versatile",    # verified
                "groq-qwen2.5": "qwen/qwen3-32b",              # verified available ID
                "groq-llama3.1": "llama-3.1-8b-instant",       # verified
                "groq-gemma2": "llama-3.1-8b-instant",         # Fallback (Gemma not available)
            }
            # Default to Llama 3.3 if generic 'groq' or unknown is passed
            actual_model = model_map.get(provider, "llama-3.3-70b-versatile")
            
            from langchain_groq import ChatGroq
            return ChatGroq(
                model=actual_model,
                api_key=settings.GROQ_API_KEY,
                temperature=0
            )
        else:
            raise ValueError(f"Unsupported LLM provider: {provider}")
