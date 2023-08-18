"""
scoring.py

Helper script to generate a line chart of scoring of a fantasy football game

Expected usage: python scoring.py [matchup key] [connection url]
Outputs: PNG image, expected to be read by the bot (should be UTF-8 encoded)
"""

from datetime import datetime
from multiprocessing.forkserver import read_signed
from pymongo import MongoClient
import plotly.graph_objects as go
import pandas
import sys
import os

def get_scores(key: str, connection_url: str = 'mongodb://localhost:27017'):
    instance = MongoClient(host = connection_url)
    db = instance['tangledbot']
    matchup = db.get_collection('matchups').find_one({
        'matchupKey': key
    })

    if matchup != None:
        team1ScoreTiming = matchup['team1ScoreTiming']
        team2ScoreTiming = matchup['team2ScoreTiming']

        times = [datetime.fromtimestamp(x[0] / 1000.0) for x in team1ScoreTiming]

        team1scores = [x[1] for x in team1ScoreTiming]
        team2scores = [x[1] for x in team2ScoreTiming]

        team1prob = [x[2] for x in team1ScoreTiming]
        team2prob = [x[2] for x in team2ScoreTiming]

        return {
            'team1': matchup['team1Name'],
            'team1score': team1scores,
            'team1prob': team1prob,
            'team2': matchup['team2Name'],
            'team2score': team2scores,
            'team2prob': team2prob,
            'timestamp': times
        }

def generate_figure(details: dict):
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
    connectionUrl = sys.argv[2]
    details = get_scores(scoring)
    
    if details != None:
        fig = generate_figure(details)
        # with open('test.png', 'wb') as stdout:
        with os.fdopen(sys.stdout.fileno(), 'wb') as stdout:
            fig.write_image(file=stdout, format='png', width=1000, height=700)
    
    exit(0)
