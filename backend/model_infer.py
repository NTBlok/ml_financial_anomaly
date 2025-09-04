import joblib
import pandas as pd

def load_anomaly_model(model_path: str):
    return joblib.load(model_path)

def infer_anomaly(model_path: str, X, df: pd.DataFrame):
    model = load_anomaly_model(model_path)
    predictions = model.predict(X)
    df['anomaly'] = (predictions == -1).astype(int)
    return df
