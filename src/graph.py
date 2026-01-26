from typing import TypedDict, Annotated, List
from langgraph.graph import StateGraph, END
from src.model_factory import LLMFactory
from langchain_core.messages import SystemMessage, HumanMessage

# Define the State
class AgentState(TypedDict):
    input_text: str
    problem_type: str
    real_world_context: str
    equations: List[str]
    solution: str
    explanation: str
    practice_problems: List[str]
    references: List[str]
    image_data: str | None # Base64 encoded image

# Helper to get LLM from config
def get_llm_from_config(config):
    configurable = config.get("configurable", {})
    return LLMFactory.get_llm(
        provider=configurable.get("model_provider"), 
        model_name=configurable.get("model_name")
    )

# Nodes
# Helper to clean LLM response (remove <think> blocks)
import re
def clean_content(text: str) -> str:
    # Remove <think>...</think> blocks including newlines
    text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL)
    return text.strip()

# Nodes
def analyze_image(state: AgentState, config):
    print("---ANALYZING IMAGE---")
    if not state.get("image_data"):
        print("No image data found, skipping vision analysis")
        return {"input_text": state["input_text"]}
    
    # Use dedicated vision model
    # Vision Model (Gemini) does not strictly require GROQ_KEY check here.
    # Factory handles specific checks.

    try:
        vision_llm = LLMFactory.get_vision_model()
    except Exception as e:
        return {"input_text": state["input_text"] + f"\n[System Error: Failed to load vision model: {e}]"}

    # Parse image data
    image_data = state['image_data']
    if "data:image" not in image_data:
        image_url = f"data:image/jpeg;base64,{image_data}"
    else:
        image_url = image_data

    message = HumanMessage(
        content=[
            {"type": "text", "text": "Analyze this image and extract the math problem exactly. If it involves geometry or trigonometry, describe the diagram properties (angles, lengths) clearly. Output standard plain text for equations (e.g., 'x^2', '1/2'). Do NOT use LaTeX or backslashes. Return ONLY the math problem statement, no conversational filler."},
            {"type": "image_url", "image_url": {"url": image_url}} 
        ]
    )
    
    try:
        response = vision_llm.invoke([message])
        print(f"Vision output: {response.content}")
        return {"input_text": clean_content(response.content)}
    except Exception as e:
        print(f"Vision Error: {e}")
        return {"input_text": state["input_text"]} # Fallback

def classify_problem(state: AgentState, config):
    print("---CLASSIFYING PROBLEM---")
    llm = get_llm_from_config(config)
    prompt = f"""
    Classify the user input: "{state['input_text']}" into exactly ONE of the following.
    
    PRIORITY CATEGORIES (Check these first):
    1. "Sum and Difference"
    2. "Item and Property"
    3. "Motions"
    4. "Mixtures"
    5. "Perimeter of Rectangle"
    
    If the input is a valid math problem but does NOT fit the above 5, classify it by its specific field, such as:
    - "Algebra"
    - "Trigonometry"
    - "Calculus"
    - "Geometry"
    - "Arithmetic"
    - "Probability"
    - etc.
    
    If the input is NOT a math problem, classify as:
    - "Greeting" (e.g., hi, hello)
    - "Irrelevant" (e.g., general chat, non-math question)
    - "Incomplete" (e.g., "Find x" with no context)

    Return ONLY the category name. Do not add explanations.
    """
    response = llm.invoke([HumanMessage(content=prompt)])
    return {"problem_type": clean_content(response.content)}

def handle_irrelevant_input(state: AgentState, config):
    print("---HANDLING IRRELEVANT INPUT---")
    # Strict Guardrail Response
    ptype = state.get("problem_type", "").lower()
    
    if "incomplete" in ptype:
        msg = "**Incomplete Data:** I am here to solve math problems, but I need more information to solve this one. Please provide the full equation or context."
    else:
        msg = "**Math Only:** Hello! I am here to solve ONLY math problems. I cannot help with greetings, general chat, or non-math topics. Please copy-paste a valid math problem or upload an image."

    return {
        "solution": "N/A", 
        "explanation": msg,
        "real_world_context": "N/A",
        "equations": [],
        "practice_problems": [],
        "references": []
    }

def generate_real_world_context(state: AgentState, config):
    print("---GENERATING CONTEXT---")
    llm = get_llm_from_config(config)
    prompt = f"Explain this math problem using a simple real-life example or analogy to help a student understand the concept: {state['input_text']}"
    response = llm.invoke([HumanMessage(content=prompt)])
    return {"real_world_context": clean_content(response.content)}

def extract_equations(state: AgentState, config):
    print("---EXTRACTING EQUATIONS---")
    llm = get_llm_from_config(config)
    prompt = f"Extract variables and equations from this {state['problem_type']} problem: {state['input_text']}. Return them as a python list of strings."
    response = llm.invoke([HumanMessage(content=prompt)])
    return {"equations": [clean_content(response.content)]} 

import re

def solve_equations(state: AgentState, config):
    print("---SOLVING EQUATIONS---")
    llm = get_llm_from_config(config)
    # STRICT BOLDING INSTRUCTION
    prompt = f"Solve these equations step-by-step: {state.get('equations')}. **CRITICAL**: 1. You MUST use bold formatting for EVERY step number (e.g., '**Step 1:**'). 2. Output simple plain text math (e.g., '1/3', 'x^2'). Do NOT use LaTeX (no `\\frac`, `\\times`, etc.). Return the final solution."
    response = llm.invoke([HumanMessage(content=prompt)])
    
    # Force bolding via Regex
    content = clean_content(response.content)
    content = re.sub(r'(?m)^(Step \d+:?)', r'**\1**', content) # Matches "Step 1:" at start of line
    content = re.sub(r'\*\*(Step \d+:?)\*\*', r'**\1**', content) # Avoid double bolding if LLM did it right
    
    return {"solution": content}

def generate_explanation(state: AgentState, config):
    print("---GENERATING EXPLANATION---")
    llm = get_llm_from_config(config)
    # STRICT BOLDING INSTRUCTION
    prompt = f"Provide a clear, step-by-step explanation for the solution: {state['solution']}, given the original problem: {state['input_text']}. **CRITICAL**: 1. Format every step header in BOLD (e.g., '**Step 1:**'). 2. Use clean, plain text for math (e.g., '30 * 1/3 = 10'). Do NOT use LaTeX formatting."
    response = llm.invoke([HumanMessage(content=prompt)])
    
    # Force bolding via Regex
    content = clean_content(response.content)
    content = re.sub(r'(?m)^(Step \d+:?)', r'**\1**', content)
    content = re.sub(r'\*\*(Step \d+:?)\*\*', r'**\1**', content) # Fix double bolding
    
    return {"explanation": content}

def generate_practice(state: AgentState, config):
    print("---GENERATING PRACTICE---")
    llm = get_llm_from_config(config)
    prompt = f"Generate 2 similar practice problems based on the concept of {state['problem_type']} and the original problem: {state['input_text']}. Return them as a numbered list."
    response = llm.invoke([HumanMessage(content=prompt)])
    content = clean_content(response.content)
    problems = content.split("\n")
    return {"practice_problems": [p for p in problems if p.strip()]}

def generate_resources(state: AgentState, config):
    print("---GENERATING RESOURCES---")
    llm = get_llm_from_config(config)
    prompt = f"""
    Suggest 2 YouTube videos and 2 Medium articles strictly related to '{state['problem_type']}' and '{state['input_text']}'.
    
    Return them as a bulleted list of Markdown links. 
    - For YouTube, construct the link as: `[Video Title](https://www.youtube.com/results?search_query=Video+Title)`
    - For Medium, construct the link as: `[Article Title](https://medium.com/search?q=Article+Title)`
    
    Do not invent fake VIDEO IDs. Use the search query format to ensure links work.
    """
    response = llm.invoke([HumanMessage(content=prompt)])
    return {"references": [clean_content(response.content)]}

# Graph Construction
workflow = StateGraph(AgentState)

workflow.add_node("analyze_image", analyze_image)
workflow.add_node("classify", classify_problem)
workflow.add_node("real_world", generate_real_world_context)
workflow.add_node("extract", extract_equations)
workflow.add_node("solve", solve_equations)
workflow.add_node("explain", generate_explanation)
workflow.add_node("practice", generate_practice)
workflow.add_node("resources", generate_resources)

workflow.add_node("guardrail", handle_irrelevant_input)

workflow.set_entry_point("analyze_image")

def route_based_on_classification(state: AgentState):
    ptype = state.get("problem_type", "").lower()
    # Check for non-math keywords
    if "greeting" in ptype or "irrelevant" in ptype or "incomplete" in ptype:
        return "guardrail"
    return "real_world"

workflow.add_edge("analyze_image", "classify")
workflow.add_conditional_edges(
    "classify",
    route_based_on_classification,
    {
        "real_world": "real_world",
        "guardrail": "guardrail"
    }
)
workflow.add_edge("guardrail", END)

workflow.add_edge("real_world", "extract")
workflow.add_edge("extract", "solve")
workflow.add_edge("solve", "explain")
workflow.add_edge("explain", "practice")
workflow.add_edge("practice", "resources")
workflow.add_edge("resources", END)

app = workflow.compile()
