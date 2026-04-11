from src.config import settings

class LLMFactory:
    @staticmethod
    def get_llm(provider: str = None, model_name: str = None):
        provider = provider or settings.DEFAULT_LLM
        
        if provider == "openai":
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(
                model=model_name or "gpt-4o-mini",
                api_key=settings.OPENAI_API_KEY,
                temperature=0
            )
        elif provider == "anthropic":
            from langchain_anthropic import ChatAnthropic
            return ChatAnthropic(
                model=model_name or "claude-3-5-sonnet-20240620",
                api_key=settings.ANTHROPIC_API_KEY,
                temperature=0
            )
        
        # --- SIMPLE GROQ ROUTING (RESET) ---
        
        # 1. Map requested provider to specific Groq model
        # User requested Llama 3.1 as the universal fallback for others
        model_map = {
            "groq-llama3.3": "llama-3.3-70b-versatile", # Specific Llama 3.3 request
            "groq-llama3.1": "llama-3.1-8b-instant",   # Specific Llama 3.1 request
        }
        
        # For Qwen, Gemma, Gemini -> Default to Llama 3.1 as fallback
        target_model = model_map.get(provider, "llama-3.1-8b-instant")
        
        print(f"DEBUG: Routing '{provider}' to Groq Model: '{target_model}'")
        
        from langchain_groq import ChatGroq
        return ChatGroq(
            model=target_model,
            api_key=settings.GROQ_API_KEY,
            temperature=0
        )

    @staticmethod
    def get_vision_model():
        """Returns a Gemini 1.5 Flash model for Vision"""
        from langchain_google_genai import ChatGoogleGenerativeAI
        import os
        return ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=os.environ.get("GOOGLE_API_KEY"),
            temperature=0
        )
