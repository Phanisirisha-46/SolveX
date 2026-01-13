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
    # Naive parsing for skeleton - in production use structured output
    return {"equations": [response.content]} 

def solve_equations(state: AgentState, config):
    print("---SOLVING EQUATIONS---")
    # For now, we mock the solution step or use LLM if not using SymPy
    llm = get_llm_from_config(config)
    prompt = f"Solve these equations step-by-step: {state.get('equations')}. Return the final solution."
    response = llm.invoke([HumanMessage(content=prompt)])
    return {"solution": response.content}

def generate_explanation(state: AgentState, config):
    print("---GENERATING EXPLANATION---")
    llm = get_llm_from_config(config)
    prompt = f"Provide a clear, step-by-step explanation for the solution: {state['solution']}, given the original problem: {state['input_text']}"
    response = llm.invoke([HumanMessage(content=prompt)])
    return {"explanation": response.content}

def generate_practice(state: AgentState, config):
    print("---GENERATING PRACTICE---")
    llm = get_llm_from_config(config)
    prompt = f"Generate 2 similar practice problems based on the concept of {state['problem_type']} and the original problem: {state['input_text']}. Return them as a numbered list."
    response = llm.invoke([HumanMessage(content=prompt)])
    problems = response.content.split("\n")
    return {"practice_problems": [p for p in problems if p.strip()]}

# Graph Construction
workflow = StateGraph(AgentState)

workflow.add_node("classify", classify_problem)
workflow.add_node("real_world", generate_real_world_context)
workflow.add_node("extract", extract_equations)
workflow.add_node("solve", solve_equations) # Solves
workflow.add_node("explain", generate_explanation) # Explains
workflow.add_node("practice", generate_practice)

workflow.set_entry_point("classify")

workflow.add_edge("classify", "real_world")
workflow.add_edge("real_world", "extract")
workflow.add_edge("extract", "solve")
workflow.add_edge("solve", "explain")
workflow.add_edge("explain", "practice")
workflow.add_edge("practice", END)

app = workflow.compile()
