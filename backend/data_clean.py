import pandas as pd

def clean_data_bitcoin(df: pd.DataFrame, price_column: str = "price") -> pd.DataFrame:
    df = df.set_index('timestamp').dropna()
    df['pct_change'] = df[price_column].pct_change().fillna(0)
    df['rolling_mean'] = df[price_column].rolling(7).mean().fillna(method="bfill")
    df['rolling_std'] = df[price_column].rolling(7).std().fillna(method="bfill")
    return df.dropna()

    
