import os
import dotenv
from langchain_core.messages import HumanMessage
from src.model_factory import LLMFactory

dotenv.load_dotenv()

# 1x1 White JPEG Pixel
SMALL_IMAGE_BASE64 = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="

def test_vision():
    print("Testing Vision Model (Gemini 2.0 Flash)...")
    
    try:
        vision_llm = LLMFactory.get_vision_model()
        print(f"Model Class: {type(vision_llm)}")
        
        message = HumanMessage(
            content=[
                {"type": "text", "text": "What color is this image? One word."},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{SMALL_IMAGE_BASE64}"}} 
            ]
        )
        
        response = vision_llm.invoke([message])
        print(f"SUCCESS! Response: {response.content}")
        
    except Exception as e:
        print(f"FAILURE: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_vision()
