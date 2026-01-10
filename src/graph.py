from typing import TypedDict, Annotated, List
from langgraph.graph import StateGraph, END
from src.model_factory import LLMFactory
from langchain_core.messages import SystemMessage, HumanMessage

# Define the State
class AgentState(TypedDict):
    input_text: str
    problem_type: str
    equations: List[str]
    solution: str
    explanation: str

# Nodes
def classify_problem(state: AgentState):
    print("---CLASSIFYING PROBLEM---")
    llm = LLMFactory.get_llm()
    # Placeholder Prompt
    prompt = f"Classify the following math problem into a category (e.g., Motion, Geometry, Algebra): {state['input_text']}. Return only the category name."
    response = llm.invoke([HumanMessage(content=prompt)])
    return {"problem_type": response.content.strip()}

def extract_equations(state: AgentState):
    print("---EXTRACTING EQUATIONS---")
    llm = LLMFactory.get_llm()
    # Placeholder logic
    # In a real scenario, we'd use structured output or a specific prompt to get equations suitable for SymPy
    prompt = f"Extract variables and equations from this {state['problem_type']} problem: {state['input_text']}. Return them as a python list of strings."
    # For now, mocking specific behavior or using a simple prompt
    response = llm.invoke([HumanMessage(content=prompt)])
    # Naive basic mock for the skeleton
    return {"equations": [response.content]} 

def solve_equations(state: AgentState):
    print("---SOLVING EQUATIONS---")
    # Here we would use SymPy
    # For the skeleton, we just pass through
    return {"solution": "x = 9 (MOCK SOLUTION)"}

def generate_explanation(state: AgentState):
    print("---GENERATING EXPLANATION---")
    llm = LLMFactory.get_llm()
    prompt = f"Explain the solution {state['solution']} for the problem: {state['input_text']}"
    response = llm.invoke([HumanMessage(content=prompt)])
    return {"explanation": response.content}

# Graph Construction
workflow = StateGraph(AgentState)

workflow.add_node("classify", classify_problem)
workflow.add_node("extract", extract_equations)
workflow.add_node("solve", solve_equations)
workflow.add_node("explain", generate_explanation)

workflow.set_entry_point("classify")

workflow.add_edge("classify", "extract")
workflow.add_edge("extract", "solve")
workflow.add_edge("solve", "explain")
workflow.add_edge("explain", END)

app = workflow.compile()
