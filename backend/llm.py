from langchain_community.chat_models import ChatOllama
from langchain.prompts import ChatPromptTemplate
from typing import Dict, Any

# Session state to track if it's the first message
session_state: Dict[str, bool] = {"first_message": True}

# Build prompt templates
initial_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an AI data assistant. You assist with interpretation of data and provide insights. Your responses are friendly and brief."),
    ("human", "{input}")
])

followup_prompt = ChatPromptTemplate.from_messages([
    ("system", "Do not greet the user again, just respond to their message."),
    ("human", "{input}")
])

def get_llm_response(user_input: str) -> str:
    """Uses LangChain to send a prompt to the Ollama server."""
    # Instantiate the model
    llm = ChatOllama(model="mistral", base_url="http://localhost:11434")
    
    # Choose the appropriate prompt based on whether it's the first message
    if session_state.get("first_message", True):
        chain = initial_prompt | llm
        session_state["first_message"] = False
    else:
        print("follow up")
        chain = followup_prompt | llm
    
    response = chain.invoke({"input": user_input})
    return response.content