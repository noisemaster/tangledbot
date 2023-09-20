import { createClient } from 'redis';
import { MongoClient } from 'mongodb';
import config from '../../config.ts';
import { XMLParser } from 'fast-xml-parser';

interface ParsedStandings {
    name: string,
    points: number,
    wins: number,
    losses: number,
    ties: number,
}

interface ScoreboardTeam {
    name: string,
    teamKey: string,
    actualPoints: number,
    projectedPoints: number,
    winProbability: number
}

interface ParsedScoreboard {
    team1: ScoreboardTeam,
    team2: ScoreboardTeam,
    id: string
}

export const getAccessToken = async () => {
    const redis = createClient({
        url: config.redis.hostname
    });

    await redis.connect();

    let accessToken = await redis.get('accessToken');

    if (!accessToken) {
        console.log('Refreshing Yahoo Fantasy Token');

        const refreshToken = await redis.get('refreshToken');

        const encoded = btoa(`${config.yahoo.clientId}:${config.yahoo.clientSecret}`);

        const refreshRequest = await fetch(`https://api.login.yahoo.com/oauth2/get_token`, {
            method: 'POST',
            body: new URLSearchParams({
                client_id: config.yahoo.clientId,
                client_secret: config.yahoo.clientSecret,
                redirect_uri: 'oob',
                refresh_token: refreshToken!,
                grant_type: 'refresh_token'
            }),
            headers: {
                'Authorization': `Basic ${encoded}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
        });

        const refreshJson = await refreshRequest.json();

        await redis.set('accessToken', refreshJson.access_token);
        await redis.expire('accessToken', 300);

        await redis.set('refreshToken', refreshJson.refresh_token);
        await redis.expire('refreshToken', 60 * 60 * 24 * 7);

        accessToken = refreshJson.access_token;
    }

    return accessToken!;
}

export const fetchStandings = async (accessToken: string, leagueId: string = '22526') => {
    const standingsRequestXML = await fetch(`https://fantasysports.yahooapis.com/fantasy/v2/league/nfl.l.${leagueId}/standings`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    const rawXML = await standingsRequestXML.text();
    const parser = new XMLParser();

    const rawStandings = parser.parse(rawXML);

    const parsedStandings: ParsedStandings[] = [];

    const league = rawStandings.fantasy_content.league;
    const standings = rawStandings.fantasy_content.league.standings.teams.team;

    for (const board of standings) {
        parsedStandings.push({
            name: board.name,
            points: board.team_standings.points_for,
            wins: board.team_standings.outcome_totals.wins,
            losses: board.team_standings.outcome_totals.losses,
            ties: board.team_standings.outcome_totals.ties,
        })
    }

    return {
        league: {
            name: league.name,
            url: league.url,
            logo: league.logo_url
        },
        standings: parsedStandings
    };
}

export const fetchScoreboard = async (accessToken: string, leagueId: string = '22526', gameId = 'nfl') => {
    const scoreboardRequest = await fetch(`https://fantasysports.yahooapis.com/fantasy/v2/league/${gameId}.l.${leagueId}/scoreboard`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    const rawScoreboard = await scoreboardRequest.text();
    const parser = new XMLParser();

    const json = parser.parse(rawScoreboard);

    const parsedScoreboard: ParsedScoreboard[] = [];

    const league = json.fantasy_content.league;
    const matchups = json.fantasy_content.league.scoreboard.matchups.matchup;
    let weekNumber = 0;

    for (const matchup of matchups) {
        weekNumber = matchup.week;

        const matchupTeams = matchup.teams.team;
        const matchupId = league.league_key + `.mu.${matchupTeams[0].team_id}.v.${matchupTeams[1].team_id}`;

        const team1 = {
            name: matchupTeams[0].name,
            teamKey: matchupTeams[0].team_key,
            actualPoints: matchupTeams[0].team_points.total,
            projectedPoints: matchupTeams[0].team_projected_points.total,
            winProbability: matchupTeams[0].win_probability
        }

        const team2 = {
            name: matchupTeams[1].name,
            teamKey: matchupTeams[1].team_key,
            actualPoints: matchupTeams[1].team_points.total,
            projectedPoints: matchupTeams[1].team_projected_points.total,
            winProbability: matchupTeams[1].win_probability
        }

        parsedScoreboard.push({
            team1, team2, id: matchupId
        });
    }

    return {
        league: {
            name: league.name,
            url: league.url,
            logo: league.logo_url,
            week: weekNumber,
        },
        scoreboard: parsedScoreboard
    };
}

export async function addPoints() {
    const accessToken = await getAccessToken();
    const {scoreboard, league} = await fetchScoreboard(accessToken);
    const mongo = await MongoClient.connect(config.mongo.url);

    const now = Date.now();
    for (const entry of scoreboard) {
        const currentData = await mongo
            .db('tangledbot')
            .collection('matchups')
            .findOne({matchupKey: entry.id});

        let team1ScoreTiming = [];
        let team2ScoreTiming = [];

        if (currentData) {
            team1ScoreTiming = currentData.team1ScoreTiming;
            team2ScoreTiming = currentData.team2ScoreTiming;
        }

        team1ScoreTiming.push([now, entry.team1.actualPoints, entry.team1.winProbability]);
        team2ScoreTiming.push([now, entry.team2.actualPoints, entry.team2.winProbability]);

        await mongo
            .db('tangledbot')
            .collection('matchups')
            .updateOne({matchupId: entry.id}, {
                $set: {
                    team1ScoreTiming,
                    team2ScoreTiming,
                    team1Name: entry.team1.name,
                    team2Name: entry.team2.name,
                    team1Score: entry.team1.actualPoints,
                    team2Score: entry.team2.actualPoints,
                },
                $setOnInsert: {
                    matchupKey: entry.id,
                    gameId: 'nfl',
                    leagueId: '1353821',
                    week: league.week,
                    team1Id: entry.team1.teamKey,
                    team2Id: entry.team2.teamKey,
                },
            }, {upsert: true});
    }
}

export const listGames = async () => {
    const mongo = await MongoClient.connect(config.mongo.url);

    const games = await mongo
        .db('tangledbot')
        .collection('matchups')
        .find({
            gameId: 'nfl',
        })
        .toArray()
        .then(arr => arr.map(x => ({
            week: x.week,
            team1: x.team1Name,
            team2: x.team2Name,
            key: x.matchupKey,
        })))

    return games.sort((a, b) => a.week - b.week);
};

export const getTransactions = async (accessToken: string, leagueId: string = '22526', gameId = 'nfl') => {
    const tradesRequest = await fetch(`https://fantasysports.yahooapis.com/fantasy/v2/league/${gameId}.l.${leagueId}/transactions;types=add,drop,trade;status=accepted`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    const tradesText = await tradesRequest.text();
    const parser = new XMLParser();

    const rawTrades = parser.parse(tradesText);
    console.log(rawTrades);

    const league = rawTrades.fantasy_content.league;
    const transactions = league.transactions.transaction;

    return {
        league: {
            name: league.name,
            url: league.url,
            logo: league.logo_url,
        }, 
        transactions
    };
}

export const getTeams = async (accessToken: string, leagueId = '22526', gameId = 'nfl') => {
    const tradesRequest = await fetch(`https://fantasysports.yahooapis.com/fantasy/v2/league/${gameId}.l.${leagueId}/teams`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    const rawXML = await tradesRequest.text();
    const parser = new XMLParser();

    const json = parser.parse(rawXML);

    return json;
}

export const getPlayerDetails = async (accessToken: string, playerId = '1353821', gameId = 'nfl') => {
    const mongo = await MongoClient.connect(config.mongo.url);
    
    // check if player exists
    const dbPlayer = await mongo
        .db('tangledbot')
        .collection('players')
        .findOne({playerId});

    if (dbPlayer) {
        dbPlayer.name = {
            full: dbPlayer.name,
        }
        return dbPlayer;
    }

    const playerRequest = await fetch(`https://fantasysports.yahooapis.com/fantasy/v2/players;player_keys=${gameId}.p.${playerId}`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    const rawXML = await playerRequest.text();
    const parser = new XMLParser();

    const json = parser.parse(rawXML);

    const player = json.fantasy_content.players.player;

    await mongo
        .db('tangledbot')
        .collection('players')
        .insertOne({
            playerKey: player.player_key,
            playerId,
            name: player.name.full,
            status: player.status,
            statusFull: player.status_full,
            team: player.editorial_team_full_name,
            teamAbbr: player.editorial_team_abbr,
            position: player.display_position,
            byeWeeks: player.bye_weeks,
            headshot: player.image_url,
        })

    return player;
}

export const collectTransactions = async () => {
    const accessToken = await getAccessToken();
    const {league, transactions} = await getTransactions(accessToken, '22526');
    const mongo = await MongoClient.connect(config.mongo.url);

    const embedsToSend: any[] = [];

    for (const transaction of transactions) {
        const dataExists = await mongo
            .db('tangledbot')
            .collection('transactions')
            .findOne({
                parentTransactionKey: transaction.transaction_key,
            });
    
        if (dataExists) {
            continue;
        }

        if (!Array.isArray(transaction.players.player)) {
            transaction.players.player = [transaction.players.player];
        }

        for (const [index, player] of transaction.players.player.entries()) {
            console.log(player);

            await mongo
                .db('tangledbot')
                .collection('transactions')
                .insertOne({
                    transactionKey: `${transaction.transaction_key}.${index}`,
                    leagueId: 22526,
                    type: transaction.type,
                    timestamp: new Date(transaction.timestamp * 1000),
                    status: player.transaction_data.type,
                    parentTransactionKey: transaction.transaction_key,
                    gameId: 'nfl',
                    name: player.name.full,
                    playerId: player.player_key,
                    position: player.position,
                    sourceType: player.transaction_data.source_type,
                    sourceTeam: player.transaction_data.source_team_name,
                    sourceTeamKey: player.transaction_data.source_team_key,
                    destinationType: player.transaction_data.destination_type,
                    destinationTeam: player.transaction_data.destination_team_name,
                    destinationTeamKey: player.transaction_data.destination_team_key,
                    winningFaabBid: player.faab_bid || null,
                });
        }

        const destinations = {};

        for (const player of transaction.players.player) {
            const destination = player.transaction_data.destination_team_name || player.transaction_data.transaction_type;

            if (destinations[destination]) {
                destinations[destination] = [];
            }
    
            destinations[destination].push(player);
        }

        const fields = [];

        for (const destination in destinations) {
            let cleanDest = destination;
            if (destination === 'waivers') {
                cleanDest = 'Waivers'
            } else if (detination === 'freeagents') {
                cleanDest = 'Free Agency'
            }

            const playersTo = destinations[destination];

            fields.push({
                name: cleanDest,
                value: playersTo.map((player: any) => {
                    `${p.name.full}\n${p.editorial_team_abbr} - ${p.display_position)}`
                })
            });
        }

        // let description = transaction.players.player.map((p: any) => {
        //     let source, destination;
        //     const type = p.transaction_data.type;
        //     const source_type = p.transaction_data.source_type;
        //     const destination_type = p.transaction_data.destination_type;
        //     if (source_type === 'team') {
        //         source = p.transaction_data.source_team_name;
        //     } else {
        //         source = p.transaction_data.source_type;
        //     }
        //     if (destination_type === 'team') {
        //         destination = p.transaction_data.destination_team_name;
        //     } else {
        //         destination = p.transaction_data.destination_type;
        //     }
        //
        //     const typeEmoji = type === 'add' ? '🔺' : type === 'drop' ? '🔻' : '🔄';
        //
        //     const finalMessage = `${p.name.full} (${p.editorial_team_abbr} - ${p.display_position}) ${typeEmoji} ${source} -> ${destination}`;
        // }).join('\n');

        if (transaction.faab_bid) {
            fields.push({
                name: 'Winning Bid'
                value: `${transaction.faab_bid}`;
            });
        }

        const embed = {
            title: 'New Transaction',
            description,
            timestamp: new Date(transaction.timestamp * 1000).toISOString(),
        }

        console.log(embed);

        embedsToSend.push(embed);
    }

    // Collect embeds in groups of 10
    const embedGroups: any[] = [];

    for (let i = 0; i < embedsToSend.length; i += 10) {
        embedGroups.push(embedsToSend.slice(i, i + 10));
    }

    for (const group of embedGroups) {
        const webhookData = {
            username: league.name,
            avatar_url: league.logo,
            embeds: group
        }
        
        // Send embeds to discord
        await fetch(config.yahoo.discordWebhook, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(webhookData)
        }).catch(err => console.error(err));
    }

};
