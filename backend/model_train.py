import joblib

def train_anomaly_model(X, model_params: dict, model: object, save_path: str):
    model = model(**model_params)
    model.fit(X)
    joblib.dump(model, save_path)
    return model
