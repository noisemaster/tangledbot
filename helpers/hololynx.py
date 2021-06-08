"""
badger.py

Helper script to generate candlestick charts using data from Yahoo Finance's API

Expected usage: python badger.py [symbol] [time range]
Outputs: PNG image, expected to be read by the bot (should be UTF-8 encoded)
"""

from datetime import datetime
import requests
import plotly.graph_objects as go
import pandas
import sys
import os

VALID_RANGES = ["1", "7", "14", "30", "90", "180", "365", "max"]

def getStock(coinId: str, timeRange: str):
    url = "https://api.coingecko.com/api/v3/coins/{}/ohlc?vs_currency=usd&days={}".format(coinId, timeRange)

    req = requests.get(url)
    data = req.json()

    timestamps = map(lambda column: datetime.fromtimestamp(column[0] / 1000), data)
    quoteOpen = map(lambda column: column[1], data)
    close = map(lambda column: column[2], data)
    high = map(lambda column: column[3], data)
    low = map(lambda column: column[4], data)

    return {
        "timestamps": timestamps,
        "open": quoteOpen,
        "close": close,
        "high": high,
        "low": low
    }

def generateFigure(details: dict):
    frame = pandas.DataFrame.from_dict(details)
    fig = go.Figure(data=[
                        go.Candlestick(
                            x=frame['timestamps'],
                            open=frame['open'],
                            high=frame['high'],
                            low=frame['low'],
                            close=frame['close']),
                        ]
                    )

    fig.update_layout(
        xaxis_rangeslider_visible = False
    )

    return fig

if __name__ == '__main__':
    stock = sys.argv[1]
    timeRange = sys.argv[2]

    if (timeRange not in VALID_RANGES):
        exit(130)

    details = getStock(stock, timeRange)
    fig = generateFigure(details)

    with os.fdopen(sys.stdout.fileno(), 'wb') as stdout:
        fig.write_image(file=stdout, format='png', width=1000, height=700)
    
    exit(0)
