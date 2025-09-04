import pandas as pd
from sklearn.preprocessing import StandardScaler

def preprocess_data(df: pd.DataFrame, y_column: str, holdout: int = 0.2) -> pd.DataFrame:
    features = list(df.columns)
    features.remove(y_column)
    split_idx = int(len(df) * (1 - holdout))
    train_df = df.iloc[:split_idx].copy()
    infer_df = df.iloc[split_idx:].copy()
    scaler = StandardScaler()
    X_train = scaler.fit_transform(train_df[features])
    X_infer = scaler.transform(infer_df[features])
    return X_train, X_infer, train_df, infer_df, scaler