"""
badger.py

Helper script to generate candlestick charts using data from Yahoo Finance's API

Expected usage: python badger.py [symbol]
Outputs: PNG image, expected to be read by the bot (should be UTF-8 encoded)
"""

from datetime import datetime
import requests
import plotly.graph_objects as go
import pandas
import sys
import os

"""
This'll assume that the quote provided is valid since it'll be called after a call to
Yahoo Finance's API anyways
"""
def getStock(stock: str):
    req = requests.get("https://query1.finance.yahoo.com/v8/finance/chart/{}?interval=2m".format(stock))
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

if __name__ == '__main__':
    stock = sys.argv[1]
    details = getStock(stock)

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

    with os.fdopen(sys.stdout.fileno(), 'wb') as stdout:
        fig.write_image(file=stdout, format='png', width=1000, height=700)
    
    exit(0)
