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

# Helper to get LLM from config
def get_llm_from_config(config):
    configurable = config.get("configurable", {})
    return LLMFactory.get_llm(
        provider=configurable.get("model_provider"), 
        model_name=configurable.get("model_name")
    )

# Nodes
def classify_problem(state: AgentState, config):
    print("---CLASSIFYING PROBLEM---")
    llm = get_llm_from_config(config)
    prompt = f"Classify the following math problem into a category (e.g., Motion, Geometry, Algebra): {state['input_text']}. Return only the category name."
    response = llm.invoke([HumanMessage(content=prompt)])
    return {"problem_type": response.content.strip()}

def generate_real_world_context(state: AgentState, config):
    print("---GENERATING CONTEXT---")
    llm = get_llm_from_config(config)
    prompt = f"Explain this math problem using a simple real-life example or analogy to help a student understand the concept: {state['input_text']}"
    response = llm.invoke([HumanMessage(content=prompt)])
    return {"real_world_context": response.content}

def extract_equations(state: AgentState, config):
    print("---EXTRACTING EQUATIONS---")
    llm = get_llm_from_config(config)
    prompt = f"Extract variables and equations from this {state['problem_type']} problem: {state['input_text']}. Return them as a python list of strings."
    response = llm.invoke([HumanMessage(content=prompt)])
    return {"equations": [response.content]} 

import re

def solve_equations(state: AgentState, config):
    print("---SOLVING EQUATIONS---")
    llm = get_llm_from_config(config)
    # STRICT BOLDING INSTRUCTION
    prompt = f"Solve these equations step-by-step: {state.get('equations')}. **CRITICAL**: You MUST use bold formatting for EVERY step number (e.g., '**Step 1:**', '**Step 2:**'). Do not use plain text for step headers. Return the final solution."
    response = llm.invoke([HumanMessage(content=prompt)])
    
    # Force bolding via Regex
    content = response.content
    content = re.sub(r'(?m)^(Step \d+:?)', r'**\1**', content) # Matches "Step 1:" at start of line
    content = re.sub(r'\*\*(Step \d+:?)\*\*', r'**\1**', content) # Avoid double bolding if LLM did it right
    
    return {"solution": content}

def generate_explanation(state: AgentState, config):
    print("---GENERATING EXPLANATION---")
    llm = get_llm_from_config(config)
    # STRICT BOLDING INSTRUCTION
    prompt = f"Provide a clear, step-by-step explanation for the solution: {state['solution']}, given the original problem: {state['input_text']}. **CRITICAL**: Format every step header in BOLD (e.g., '**Step 1:**', '**Step 2:**')."
    response = llm.invoke([HumanMessage(content=prompt)])
    
    # Force bolding via Regex
    content = response.content
    content = re.sub(r'(?m)^(Step \d+:?)', r'**\1**', content)
    content = re.sub(r'\*\*(Step \d+:?)\*\*', r'**\1**', content) # Fix double bolding
    
    return {"explanation": content}

def generate_practice(state: AgentState, config):
    print("---GENERATING PRACTICE---")
    llm = get_llm_from_config(config)
    prompt = f"Generate 2 similar practice problems based on the concept of {state['problem_type']} and the original problem: {state['input_text']}. Return them as a numbered list."
    response = llm.invoke([HumanMessage(content=prompt)])
    problems = response.content.split("\n")
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
    return {"references": [response.content]}

# Graph Construction
workflow = StateGraph(AgentState)

workflow.add_node("classify", classify_problem)
workflow.add_node("real_world", generate_real_world_context)
workflow.add_node("extract", extract_equations)
workflow.add_node("solve", solve_equations)
workflow.add_node("explain", generate_explanation)
workflow.add_node("practice", generate_practice)
workflow.add_node("resources", generate_resources)

workflow.set_entry_point("classify")

workflow.add_edge("classify", "real_world")
workflow.add_edge("real_world", "extract")
workflow.add_edge("extract", "solve")
workflow.add_edge("solve", "explain")
workflow.add_edge("explain", "practice")
workflow.add_edge("practice", "resources")
workflow.add_edge("resources", END)

app = workflow.compile()
