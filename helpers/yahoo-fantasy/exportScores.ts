import { MongoClient } from 'npm:mongodb';
import config from '../../config.ts';

const mongo = await MongoClient.connect(config.mongo.url);
const data = Deno.readTextFileSync('./scores.json');
const json: any[] = JSON.parse(data);

const teamKeyMap: {[x: string]: string} = {
    "Georgetown Georges": "414.l.135821.t.4",
    "LFY's Fascinating Yeeters": "414.l.135821.t.7",
    "Seattle Businessmen": "414.l.135821.t.1",
    "Flemington Furries": "414.l.135821.t.3",
    "Winnipeg Stabfest": "414.l.135821.t.8",
    "Slab Squatthrusts": "414.l.135821.t.6",
    "2 Coopers 1 Kupp": "414.l.135821.t.2",
    "Klepto's Clef Toes": "414.l.135821.t.5",
    "Klepto's Clef Tua": "414.l.135821.t.5",
    "2 Old Men and a Sun God": "414.l.135821.t.8",
    "Ben Craven some Wins": "414.l.135821.t.1",
    "Raincity Bitch Pigeons": "414.l.135821.t.1",
    "THE COUGAR PIECE IS REAL": "414.l.135821.t.3",
    "Sicklerville Sickos": "414.l.135821.t.3",
    "Post Mahomes": "414.l.135821.t.2",
    "Bad Luck Brady and the Bunch": "414.l.135821.t.8",
    "Second Coming of a Sun God": "414.l.135821.t.8",
    "Thick Thighs Save Lives": "414.l.135821.t.8",
    "Absecon Axolotls": "414.l.135821.t.3",
}

for (const row of json) {
    let matchupKey = `414.l.135821.mu.${row.week}`;
    const week = row.week;

    delete row.week;

    const team1 = Object.keys(row)[0]
    const team2 = Object.keys(row)[1]

    const team1Id = teamKeyMap[team1];
    const team2Id = teamKeyMap[team2];

    const [,,,, team1No] = team1Id.split('.')
    const [,,,, team2No] = team2Id.split('.')

    matchupKey += `.${team1No}.v.${team2No}`;

    console.log(`Importing ${team1} vs ${team2} - Week ${week}`);
    
    await mongo
        .db('tangledbot')
        .collection('matchups')
        .updateOne(
            {
                matchupKey,
            }, {
                $setOnInsert: {
                    matchupKey,
                    gameId: 414,
                    leagueId: 1353821,
                    week,
                },
                $set: {
                    team1Name: team1,
                    team2Name: team2,
                    team1Id,
                    team2Id,
                    team1ScoreTiming: row[team1],
                    team2ScoreTiming: row[team2],
                    team1Score: row[team1][row[team1].length - 1][1],
                    team2ScoreMongoClient: row[team2][row[team2].length - 1][1],
                }
            }, 
            { upsert: true }    
        );
}

Deno.exit();