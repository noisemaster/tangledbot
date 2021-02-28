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

VALID_RANGES = ["1d","5d","1mo","3mo","6mo","1y","2y","5y","10y","ytd","max"]
VALID_INTERVALS = ["1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h", "1d", "5d", "1wk", "1mo", "3mo"]

INTERVALS = {
    "1d": "2m",
    "5d": "5m",
    "1mo": "1d",
    "3mo": "1d",
    "6mo": "1wk",
    "1y": "1wk",
    "2y": "1mo",
    "5y": "1mo",
    "ytd": "1mo",
    "max": "3mo",
}

"""
This'll assume that the quote provided is valid since it'll be called after a call to
Yahoo Finance's API anyways
"""
def getStock(stock: str, timeRange: str):
    interval = INTERVALS[timeRange]
    url = "https://query1.finance.yahoo.com/v8/finance/chart/{}?range={}&interval={}".format(stock, timeRange, interval)

    req = requests.get(url)
    data = req.json()

    timestamps = data["chart"]["result"][0]['timestamp']
    timestamps = map(lambda stamp: datetime.fromtimestamp(stamp), timestamps)

    quoteOpen = data["chart"]["result"][0]['indicators']['quote'][0]['open']
    close = data["chart"]["result"][0]['indicators']['quote'][0]['close']
    volume = data["chart"]["result"][0]['indicators']['quote'][0]['volume']
    high = data["chart"]["result"][0]['indicators']['quote'][0]['high']
    low = data["chart"]["result"][0]['indicators']['quote'][0]['low']

    return {
        "timestamps": timestamps,
        "open": quoteOpen,
        "close": close,
        "volume": volume,
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
