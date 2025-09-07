from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
from model_infer import infer_anomaly, load_anomaly_model as load_model
from utils.constants import BITCOIN_URL, BITCOIN_REQUEST_PARAMS, BITCOIN_RESPONSE_PARAMS, BITCOIN_MODEL_PARAMS
from data_fetch import fetch_timestamp_data
from data_clean import clean_data_bitcoin
from model_preprocess import preprocess_data
from model_train import train_anomaly_model

app = FastAPI()
model = load_model("model.pkl")

class PredictRequest(BaseModel):
    features: list

@app.post("/infer")
def infer_bitcoin_anomaly():
    df = fetch_timestamp_data(BITCOIN_URL, BITCOIN_REQUEST_PARAMS, BITCOIN_RESPONSE_PARAMS)
    df_clean = clean_data_bitcoin(df)
    X_train, X_infer, train_df, infer_df, scaler = preprocess_data(df_clean, 'price')
    model = train_anomaly_model(X_train, model_params=BITCOIN_MODEL_PARAMS['model_params'], model=BITCOIN_MODEL_PARAMS['model'], save_path=BITCOIN_MODEL_PARAMS['save_path'])
    infer_df = infer_anomaly(BITCOIN_MODEL_PARAMS['save_path'], X_infer, infer_df)
    return [{"series":"anomaly", "data": infer_df[infer_df['anomaly']==1].to_dict(orient="records")}, {"series":"normal", "data": infer_df[infer_df['anomaly']==0].to_dict(orient="records")}]
    