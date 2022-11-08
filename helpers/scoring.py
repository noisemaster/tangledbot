"""
badger.py

Helper script to generate candlestick charts using data from Yahoo Finance's API

Expected usage: python badger.py [symbol] [time range]
Outputs: PNG image, expected to be read by the bot (should be UTF-8 encoded)
"""

from datetime import datetime
from multiprocessing.forkserver import read_signed
import redis
import plotly.graph_objects as go
import pandas
import sys
import os
import json

"""
This'll assume that the quote provided is valid since it'll be called after a call to
Yahoo Finance's API anyways
"""
def getStock(key: str):
    instance = redis.Redis(
        host='lot-server.local',
    )
    data = instance.get(key)
    if data != None:
        strdata = bytes.decode(data)
        scoreData = json.loads(strdata)
        teams = list(scoreData.keys())

        times = [datetime.fromtimestamp(x[0] / 1000.0) for x in scoreData[teams[0]]]

        team1scores = [x[1] for x in scoreData[teams[0]]]
        team2scores = [x[1] for x in scoreData[teams[1]]]

        team1prob = [x[2] for x in scoreData[teams[0]]]
        team2prob = [x[2] for x in scoreData[teams[1]]]

        return {
            'team1': teams[0],
            'team1score': team1scores,
            'team1prob': team1prob,
            'team2': teams[1],
            'team2score': team2scores,
            'team2prob': team2prob,
            'timestamp': times
        }

def generateFigure(details: dict):
    frame = pandas.DataFrame.from_dict(details)
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=frame['timestamp'],
        y=frame['team1score'],
        mode='lines',
        name=details['team1']
    ))

    fig.add_trace(go.Scatter(
        x=frame['timestamp'],
        y=frame['team2score'],
        mode='lines',
        name=details['team2']
    ))

    fig.update_xaxes(
        rangebreaks=[
            dict(bounds=["fri", "sat"]),
        ]
    )

    fig.update_layout(
        xaxis_rangeslider_visible = False,
    )

    fig.update_layout(legend=dict(
        yanchor="top",
        y=0.99,
        xanchor="left",
        x=0.01
    ))

    return fig

if __name__ == '__main__':
    scoring = sys.argv[1]
    details = getStock(scoring)
    
    if details != None:
        fig = generateFigure(details)
        # with open('test.png', 'wb') as stdout:
        with os.fdopen(sys.stdout.fileno(), 'wb') as stdout:
            fig.write_image(file=stdout, format='png', width=1000, height=700)
    
    exit(0)
