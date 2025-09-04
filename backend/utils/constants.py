from sklearn.ensemble import IsolationForest
BITCOIN_URL = "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart"

BITCOIN_REQUEST_PARAMS = {
    "vs_currency": "usd",
    "days": 30,
}

BITCOIN_RESPONSE_PARAMS = {
    "key": "prices",
    "columns": ["timestamp", "price"],
}

BITCOIN_MODEL_PARAMS = {
    "model": IsolationForest,
    "model_params": {
        "n_estimators": 100,
        "max_samples": 0.8,
        "max_features": 0.8,
        "bootstrap": True,
        "n_jobs": -1,
        "random_state": 42,
        "contamination": 0.05,
    },
    "save_path": "model.pkl",
}