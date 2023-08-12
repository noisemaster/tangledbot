import { connect } from 'redis/mod.ts';
import { getAccessToken, getTeams } from './mod.ts';
import { MongoClient } from 'npm:mongodb';
import config from "../../config.ts";

const mongo = await MongoClient.connect(config.mongo.url);

console.log('Connected to MongoDB')
console.log('Importing data...')
console.log('Importing NFL 2022...')

await mongo
    .db('tangledbot')
    .collection('games')
    .updateOne(
        {
            id: 414
        },
        {
            $setOnInsert: {
                id: 414,
                sport: 'nfl',
                year: '2022',
            }
        },
        { upsert: true }
    )

await mongo
    .db('tangledbot')
    .collection('leagues')
    .updateOne(
        {
            id: 1353821
        },
        {
            $setOnInsert: {
                id: 1353821,
                sportId: 414,
                key: '414.l.1353821',
                name: 'Fireworks Football Fanatics',
                url: "https://football.fantasysports.yahoo.com/2022/f1/1353821",
                logo: "https://yahoofantasysports-res.cloudinary.com/image/upload/t_s192sq/fantasy-logos/bc4791dc2df5a54e1129c71f2a150f9f983796450d6d5d8070507ace0b3b6f50.jpg",
            }
        },
        { upsert: true }
    )

const transactionData = await Deno.readTextFile('transactions.json').then(x => JSON.parse(x));

const transactions = transactionData.fantasy_content.league.transactions.transaction;

for (const transaction of transactions) {
    if (!Array.isArray(transaction.players.player)) {
        transaction.players.player = [transaction.players.player];
    }

    const [gameId] = transaction.transaction_key.split('.');

    await mongo
        .db('tangledbot')
        .collection('transactions')
        .updateOne(
            {
                transactionKey: transaction.transaction_key,
            },
            {
                $setOnInsert: {
                    transactionKey: transaction.transaction_key,
                    leagueId: 1353821,
                    type: transaction.type,
                    timestamp: new Date(transaction.timestamp * 1000),
                    status: transaction.status,
                },
                $set: {
                    gameId: Number(gameId),
                    players: transaction.players.player,
                }
            },
            { upsert: true }
        )
}

console.log('Getting Teams...');

const accessToken = await getAccessToken();
const teams = await getTeams(accessToken)
    .then(x => x.fantasy_content.league.teams.team);

for (const team of teams) {
    await mongo
        .db('tangledbot')
        .collection('teams')
        .updateOne(
            {
                teamKey: team.team_key,
            },
            {
                $setOnInsert: {
                    teamKey: team.team_key,
                    leagueId: 1353821,
                    sportId: 414,
                    logo: team.team_logos.team_logo.url,
                    manager: team.managers.manager.nickname,
                    managerAvatar: team.managers.manager.image_url,
                },
                $set: {
                    name: team.name,
                },
            },
            { upsert: true }
        )
}

console.log('Done!');
Deno.exit(0);