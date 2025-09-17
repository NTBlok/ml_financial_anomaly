from typing import Dict, List, Any
from langchain_community.llms import Ollama
from langchain.prompts import ChatPromptTemplate
from langchain.schema.output_parser import StrOutputParser
import os
import pandas as pd
from typing import Optional
import requests
import time

class AnomalyExplainer:
    def __init__(self, model_name: str = "mistral", temperature: float = 0.3, base_url: Optional[str] = None):
        """Initialize the LLM explainer with specified model.
        
        Args:
            model_name: Name of the Ollama model to use (default: "mistral")
            temperature: Controls randomness in the response (0.0 to 1.0)
            base_url: Base URL for the Ollama API (default: None, will use OLLAMA_BASE_URL env var or http://localhost:11434)
        """
        self.model_name = model_name
        self.base_url = base_url or os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.ensure_model_available()
        
        self.llm = Ollama(
            model=model_name,
            temperature=temperature,
            base_url=self.base_url
        )
    
    def ensure_model_available(self, max_retries: int = 3, retry_delay: int = 5):
        """Ensure the specified model is available, pulling it if necessary."""
        for attempt in range(max_retries):
            try:
                # Check if model is available
                response = requests.get(f"{self.base_url}/api/tags")
                if response.status_code == 200:
                    models = response.json().get('models', [])
                    if any(m['name'].startswith(f"{self.model_name}:") for m in models):
                        return  # Model is available
                
                # If we get here, model needs to be pulled
                print(f"Pulling model {self.model_name}...")
                response = requests.post(
                    f"{self.base_url}/api/pull",
                    json={"name": self.model_name}
                )
                response.raise_for_status()
                return
                
            except requests.exceptions.RequestException as e:
                if attempt == max_retries - 1:
                    raise RuntimeError(f"Failed to ensure model {self.model_name} is available: {e}")
                print(f"Attempt {attempt + 1} failed, retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
        self.prompt_template = """
        You are a financial analyst specializing in cryptocurrency markets. 
        Analyze the following price anomaly and provide a concise explanation.
        
        Timestamp: {timestamp}
        Price: ${price:,.2f}
        Percentage Change: {pct_change:.2%}
        
        Recent Price Movement:
        {recent_prices}
        
        Provide a brief explanation of what might have caused this anomaly.
        Consider factors like:
        - Market news or events
        - Technical patterns
        - Volume changes
        - Market sentiment
        
        Explanation:
        """
    
    def get_recent_price_context(self, df: pd.DataFrame, idx: int, window: int = 5) -> str:
        """Get context of recent prices before the anomaly."""
        start = max(0, idx - window)
        context = []
        for i in range(start, idx):
            if i >= 0 and i < len(df):
                row = df.iloc[i]
                context.append(f"- {row.name}: ${row['price']:,.2f} ({row['pct_change']:.2%})")
        return "\n".join(context)
    
    def explain_anomaly(self, df: pd.DataFrame, idx: int) -> Dict[str, Any]:
        """Generate an explanation for an anomaly using LLM."""
        if idx >= len(df):
            return {"error": "Index out of bounds"}
            
        row = df.iloc[idx]
        recent_prices = self.get_recent_price_context(df, idx)
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a helpful financial analyst."),
            ("human", self.prompt_template.format(
                timestamp=row.name,
                price=row['price'],
                pct_change=row.get('pct_change', 0),
                recent_prices=recent_prices
            ))
        ])
        
        chain = prompt | self.llm | StrOutputParser()
        explanation = chain.invoke({})
        
        return {
            "timestamp": str(row.name),
            "price": row['price'],
            "pct_change": float(row.get('pct_change', 0)),
            "explanation": explanation.strip()
        }
    
    def generate_weak_labels(self, df: pd.DataFrame, anomaly_indices: List[int]) -> pd.DataFrame:
        """Generate weak labels for anomalies using LLM explanations."""
        explanations = []
        for idx in anomaly_indices:
            explanation = self.explain_anomaly(df, idx)
            explanations.append(explanation)
            
        return pd.DataFrame(explanations)
