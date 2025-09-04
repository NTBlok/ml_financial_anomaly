import requests
import pandas as pd
# from utils.constants import BITCOIN_URL, BITCOIN_PARAMS

# def fetch_data_bitcoin(params: dict = None) -> pd.DataFrame:
#     response = requests.get(BITCOIN_URL, params=BITCOIN_PARAMS)
#     response.raise_for_status()
#     data = response.json()
#     df = pd.DataFrame(data['prices'], columns=['timestamp', 'price'])
#     df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
#     return df


def fetch_timestamp_data(url: str, request_params: dict = None, response_params: dict = None) -> pd.DataFrame:
    response = requests.get(url, params=request_params)
    response.raise_for_status()
    data = response.json()
    df = pd.DataFrame(data[response_params[ 'key']], columns=response_params['columns'])
    df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
    return df