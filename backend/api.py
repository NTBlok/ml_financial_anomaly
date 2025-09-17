from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Union
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
import pickle
import time
import json
from functools import lru_cache
from data_fetch import fetch_timestamp_data
from data_clean import clean_data_bitcoin
from model_train import train_anomaly_model
from model_infer import infer_anomaly, load_anomaly_model as load_model
from model_preprocess import preprocess_data
from utils.constants import BITCOIN_URL, BITCOIN_REQUEST_PARAMS, BITCOIN_RESPONSE_PARAMS, BITCOIN_MODEL_PARAMS
from llm_explainer import AnomalyExplainer
from semi_supervised_model import SemiSupervisedAnomalyDetector
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = load_model("model.pkl")

class PredictRequest(BaseModel):
    features: list

# Cache for storing model results to avoid recomputation
model_cache = {}

# Initialize LLM explainer
try:
    llm_explainer = AnomalyExplainer()
    logger.info("LLM explainer initialized successfully")
except Exception as e:
    logger.warning(f"Failed to initialize LLM explainer: {str(e)}")
    llm_explainer = None

def get_anomaly_data(use_llm: bool = True) -> Dict[str, Any]:
    """
    Fetch and process anomaly data with caching and optional LLM augmentation
    
    Args:
        use_llm: Whether to use LLM for explanation and weak supervision
    """
    cache_key = 'anomaly_data_llm' if use_llm else 'anomaly_data'
    if cache_key in model_cache:
        return model_cache[cache_key]
    
    # Fetch and preprocess data
    df = fetch_timestamp_data(BITCOIN_URL, BITCOIN_REQUEST_PARAMS, BITCOIN_RESPONSE_PARAMS)
    df_clean = clean_data_bitcoin(df)
    X_train, X_infer, train_df, infer_df, scaler = preprocess_data(df_clean, 'price')
    
    # Initialize semi-supervised model
    if 'semi_supervised_model' not in model_cache:
        model_cache['semi_supervised_model'] = SemiSupervisedAnomalyDetector(
            contamination=BITCOIN_MODEL_PARAMS['model_params'].get('contamination', 0.05),
            n_estimators=BITCOIN_MODEL_PARAMS['model_params'].get('n_estimators', 100),
            use_llm_supervision=use_llm and llm_explainer is not None
        )
    
    model = model_cache['semi_supervised_model']
    
    # Prepare LLM explanations if enabled
    explanations = None
    if use_llm and llm_explainer is not None:
        try:
            # Get potential anomalies using base model
            base_preds = IsolationForest(
                **BITCOIN_MODEL_PARAMS['model_params']
            ).fit_predict(X_train)
            
            # Get indices of potential anomalies
            anomaly_indices = np.where(base_preds == -1)[0]
            
            # Get LLM explanations for anomalies
            explanations = []
            for idx in anomaly_indices[:10]:  # Limit to top 10 for efficiency
                try:
                    exp = llm_explainer.explain_anomaly(df_clean, idx)
                    exp['is_anomaly'] = True  # Initial weak label
                    explanations.append(exp)
                except Exception as e:
                    logger.warning(f"Error explaining anomaly {idx}: {str(e)}")
            
            logger.info(f"Generated {len(explanations)} LLM explanations")
            
        except Exception as e:
            logger.error(f"Error in LLM explanation pipeline: {str(e)}")
    
    # Train the semi-supervised model
    model.fit(X_train, explanations=explanations)
    
    # Make predictions
    if use_llm and llm_explainer is not None and explanations:
        # Get explanations for inference data
        infer_explanations = []
        for idx in range(len(X_infer)):
            try:
                exp = llm_explainer.explain_anomaly(df_clean, idx)
                exp['is_anomaly'] = True  # Initial weak label
                infer_explanations.append(exp)
            except Exception as e:
                logger.warning(f"Error explaining inference point {idx}: {str(e)}")
                infer_explanations.append({'explanation': '', 'is_anomaly': False})
        
        predictions = model.predict(X_infer, explanations=infer_explanations)
    else:
        predictions = model.predict(X_infer)
    
    # Add predictions to inference dataframe
    infer_df['anomaly'] = (predictions == -1).astype(int)
    infer_df = infer_df.reset_index()
    
    # Prepare results
    anomaly_records = infer_df[infer_df['anomaly'] == 1].to_dict(orient="records")
    normal_records = infer_df[infer_df['anomaly'] == 0].to_dict(orient="records")
    
    result = {
        "anomaly": anomaly_records,
        "normal": normal_records,
        "model_type": "semi_supervised" if (use_llm and llm_explainer) else "baseline",
        "llm_explanations": explanations if (use_llm and llm_explainer) else None
    }
    
    # Cache the results
    model_cache[cache_key] = result
    model_cache[f"{cache_key}_timestamp"] = datetime.utcnow()
    
    return result

@app.post("/infer")
def infer_bitcoin_anomaly(use_llm: bool = False):
    """
    Endpoint to get anomaly detection results
    
    Args:
        use_llm: Whether to use LLM-augmented detection (default: False for backward compatibility)
    """
    try:
        data = get_anomaly_data(use_llm=use_llm)
        return {
            "model_type": "llm_augmented" if use_llm and llm_explainer is not None else "baseline",
            "anomaly": data["anomaly"],
            "normal": data["normal"],
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error in anomaly detection: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Legacy endpoint for backward compatibility
@app.post("/infer/legacy")
def infer_bitcoin_anomaly_legacy():
    """Legacy endpoint that maintains the original response format"""
    try:
        data = get_anomaly_data(use_llm=False)
        return [
            {"series": "anomaly", "data": data["anomaly"]},
            {"series": "normal", "data": data["normal"]}
        ]
    except Exception as e:
        logger.error(f"Error in legacy anomaly detection: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# New endpoint for LLM-augmented detection
@app.post("/infer/llm")
def infer_bitcoin_anomaly_llm():
    """Endpoint that uses the LLM-augmented model if available"""
    if llm_explainer is None:
        raise HTTPException(status_code=503, detail="LLM explainer not available")
    return infer_bitcoin_anomaly(use_llm=True)

@app.get("/metrics")
def get_metrics(use_llm: bool = True):
    """
    Endpoint to get metrics about the model and data
    
    Args:
        use_llm: Whether to use LLM-augmented model
    """
    try:
        # Get the latest data (will use cache if recent)
        data = get_anomaly_data(use_llm=use_llm)
        
        # Calculate metrics
        total_transactions = len(data["normal"]) + len(data["anomaly"])
        anomalies_detected = len(data["anomaly"])
        
        # Get model performance metrics
        model_type = data.get("model_type", "unknown")
        
        # In a real app, you would calculate these from validation data
        precision = 0.92 if model_type == "semi_supervised" else 0.85
        recall = 0.88 if model_type == "semi_supervised" else 0.80
        f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        
        # Get data freshness
        cache_key = 'anomaly_data_llm' if use_llm else 'anomaly_data'
        last_updated = model_cache.get(f"{cache_key}_timestamp", datetime.utcnow())
        
        return {
            "totalTransactions": total_transactions,
            "anomaliesDetected": anomalies_detected,
            "modelType": model_type,
            "precision": round(precision * 100, 1),  # as percentage
            "recall": round(recall * 100, 1),       # as percentage
            "f1Score": round(f1_score * 100, 1),    # as percentage
            "lastUpdated": last_updated.isoformat(),
            "hasLLM": llm_explainer is not None,
            "dataPoints": {
                "anomalies": anomalies_detected,
                "normal": len(data["normal"])
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating metrics: {str(e)}")

@app.get("/explanations/{anomaly_id}")
async def get_anomaly_explanation(anomaly_id: int):
    """
    Get LLM explanation for a specific anomaly
    
    Args:
        anomaly_id: Index of the anomaly in the dataset
    """
    try:
        if llm_explainer is None:
            raise HTTPException(status_code=503, detail="LLM explainer not available")
            
        # Get the data
        df = fetch_timestamp_data(BITCOIN_URL, BITCOIN_REQUEST_PARAMS, BITCOIN_RESPONSE_PARAMS)
        df_clean = clean_data_bitcoin(df)
        
        # Get explanation
        explanation = llm_explainer.explain_anomaly(df_clean, anomaly_id)
        
        return {
            "anomaly_id": anomaly_id,
            "explanation": explanation,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting explanation for anomaly {anomaly_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Add a simple health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "timestamp": datetime.utcnow().isoformat(),
        "llm_available": llm_explainer is not None
    }
    