from src.graph import app
from src.config import settings

def main():
    print("Starting SolveX...")
    input_text = "A boat traveled 24 miles downstream in 2 hours. The return trip took twice as long. What is the speed of the boat in still water?"
    
    try:
        inputs = {"input_text": input_text}
        for output in app.stream(inputs):
            for key, value in output.items():
                print(f"Output from Node '{key}':")
                print("---")
                print(value)
                print("\n")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"An error occurred: {e}")
        print("Please ensure .env is set up with API keys.")

if __name__ == "__main__":
    main()
