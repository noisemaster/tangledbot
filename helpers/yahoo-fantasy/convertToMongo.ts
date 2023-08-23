import { getAccessToken, getTeams, getTransactions } from './mod.ts';
import { MongoClient } from 'mongodb';
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

const accessToken = await getAccessToken();
const {transactions} = await getTransactions(accessToken, '1353821', '414'); 

for (const transaction of transactions) {
    if (!Array.isArray(transaction.players.player)) {
        transaction.players.player = [transaction.players.player];
    }

    for (const [index, player] of transaction.players.player.entries()) {
        const [gameId] = transaction.transaction_key.split('.');

        await mongo
            .db('tangledbot')
            .collection('transactions')
            .updateOne(
                {
                    transactionKey: `${transaction.transaction_key}.${index}`,
                },
                {
                    $setOnInsert: {
                        transactionKey: `${transaction.transaction_key}.${index}`,
                        leagueId: 1353821,
                        type: transaction.type,
                        timestamp: new Date(transaction.timestamp * 1000),
                        status: player.transaction_data.type,
                    },
                    $set: {
                        parentTransactionKey: transaction.transaction_key,
                        gameId: Number(gameId),
                        name: player.name.full,
                        playerId: player.player_key,
                        position: player.position,
                        sourceType: player.transaction_data.source_type,
                        sourceTeam: player.transaction_data.source_team_name,
                        sourceTeamKey: player.transaction_data.source_team_key,
                        destinationType: player.transaction_data.destination_type,
                        destinationTeam: player.transaction_data.destination_team_name,
                        destinationTeamKey: player.transaction_data.destination_team_key,
                    }
                },
                { upsert: true }
            )
    }
}

console.log('Getting Teams...');

const teams = await getTeams(accessToken, '1353821', '414')
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

process.exit(0);