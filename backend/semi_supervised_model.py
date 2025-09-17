from typing import Dict, List, Tuple, Optional
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.base import BaseEstimator, OutlierMixin
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

class SemiSupervisedAnomalyDetector(BaseEstimator, OutlierMixin):
    def __init__(
        self,
        contamination: float = 0.05,
        n_estimators: int = 100,
        random_state: int = 42,
        llm_confidence_threshold: float = 0.7,
        use_llm_supervision: bool = True
    ):
        """
        Semi-supervised anomaly detector that combines Isolation Forest with LLM explanations.
        
        Args:
            contamination: Expected proportion of outliers in the data
            n_estimators: Number of base estimators in the Isolation Forest
            random_state: Random seed for reproducibility
            llm_confidence_threshold: Threshold for considering LLM explanations as confident
            use_llm_supervision: Whether to use LLM explanations for supervision
        """
        self.contamination = contamination
        self.n_estimators = n_estimators
        self.random_state = random_state
        self.llm_confidence_threshold = llm_confidence_threshold
        self.use_llm_supervision = use_llm_supervision
        
        # Initialize models
        self.isolation_forest = IsolationForest(
            n_estimators=n_estimators,
            contamination=contamination,
            random_state=random_state,
            n_jobs=-1
        )
        
        # Initialize sentence transformer for text embeddings
        self.sentence_encoder = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Store LLM explanations and their embeddings
        self.llm_explanations_ = None
        self.llm_embeddings_ = None
    
    def fit(self, X: np.ndarray, y: Optional[np.ndarray] = None, 
           explanations: Optional[List[Dict]] = None) -> 'SemiSupervisedAnomalyDetector':
        """
        Fit the semi-supervised anomaly detector.
        
        Args:
            X: Input features (n_samples, n_features)
            y: Optional labels (1 for anomaly, -1 for normal)
            explanations: List of LLM explanations with confidence scores
        """
        # Store LLM explanations if provided
        if self.use_llm_supervision and explanations is not None:
            self.llm_explanations_ = explanations
            # Encode explanations
            explanation_texts = [exp['explanation'] for exp in explanations]
            self.llm_embeddings_ = self.sentence_encoder.encode(explanation_texts, convert_to_tensor=True)
        
        # Fit the base Isolation Forest model
        self.isolation_forest.fit(X)
        return self
    
    def predict(self, X: np.ndarray, explanations: Optional[List[Dict]] = None) -> np.ndarray:
        """
        Predict anomalies in the data.
        
        Args:
            X: Input features (n_samples, n_features)
            explanations: List of LLM explanations for the input data
            
        Returns:
            Array of predictions (1 for normal, -1 for anomaly)
        """
        # Get base predictions from Isolation Forest
        base_preds = self.isolation_forest.predict(X)
        
        if not self.use_llm_supervision or explanations is None:
            return base_preds
            
        # Process LLM explanations if available
        explanation_texts = [exp.get('explanation', '') for exp in explanations]
        if not any(explanation_texts):
            return base_preds
            
        # Encode new explanations
        new_embeddings = self.sentence_encoder.encode(explanation_texts, convert_to_tensor=True)
        
        # Calculate similarity with known explanations
        if self.llm_embeddings_ is not None and len(self.llm_embeddings_) > 0:
            similarities = cosine_similarity(
                new_embeddings.cpu().numpy(),
                self.llm_embeddings_.cpu().numpy()
            )
            
            # Get maximum similarity for each new explanation
            max_similarities = np.max(similarities, axis=1)
            
            # Update predictions based on LLM confidence
            for i, (sim, exp) in enumerate(zip(max_similarities, explanations)):
                if sim > self.llm_confidence_threshold and exp.get('is_anomaly', False):
                    base_preds[i] = -1  # Mark as anomaly
        
        return base_preds
    
    def score_samples(self, X: np.ndarray) -> np.ndarray:
        """
        Compute the anomaly score for each sample.
        """
        return -self.isolation_forest.score_samples(X)  # Lower is more anomalous
    
    def update_with_feedback(
        self, 
        X: np.ndarray, 
        explanations: List[Dict],
        feedback: List[bool]
    ) -> None:
        """
        Update the model with user feedback on explanations.
        
        Args:
            X: Input features (n_samples, n_features)
            explanations: List of LLM explanations
            feedback: List of boolean values indicating if feedback is correct
        """
        if not self.use_llm_supervision:
            return
            
        # Add new explanations to the knowledge base
        new_explanations = [
            exp for exp, fb in zip(explanations, feedback) 
            if fb and exp.get('explanation')
        ]
        
        if not new_explanations:
            return
            
        # Update stored explanations and embeddings
        if self.llm_explanations_ is None:
            self.llm_explanations_ = []
            
        self.llm_explanations_.extend(new_explanations)
        new_embeddings = self.sentence_encoder.encode(
            [exp['explanation'] for exp in new_explanations],
            convert_to_tensor=True
        )
        
        if self.llm_embeddings_ is None:
            self.llm_embeddings_ = new_embeddings
        else:
            self.llm_embeddings_ = torch.cat([self.llm_embeddings_, new_embeddings])
