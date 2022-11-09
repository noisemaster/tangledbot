import { connect } from 'redis/mod.ts';
import { encode } from "https://deno.land/std@0.154.0/encoding/base64.ts";
import config from '../../config.ts';

interface ParsedStandings {
    name: string,
    points: number,
    wins: number,
    losses: number,
    ties: number,
}

interface ScoreboardTeam {
    name: string,
    actualPoints: number,
    projectedPoints: number,
    winProbability: number
}

interface ParsedScoreboard {
    team1: ScoreboardTeam,
    team2: ScoreboardTeam,
    key: string
}

export const getAccessToken = async () => {
    const redis = await connect({
        hostname: config.redis.hostname,
    });

    let accessToken = await redis.get('accessToken');

    if (!accessToken) {
        console.log('Refreshing Yahoo Fantasy Token');

        const refreshToken = await redis.get('refreshToken');

        const encoded = encode(`${config.yahoo.clientId}:${config.yahoo.clientSecret}`);

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

export const fetchStandings = async (accessToken: string, leagueId: string = '1353821') => {
    const standingsRequest = await fetch(`https://fantasysports.yahooapis.com/fantasy/v2/league/nfl.l.${leagueId}/standings?format=json`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    const rawStandings = await standingsRequest.json();

    const parsedStandings: ParsedStandings[] = [];

    const league = rawStandings.fantasy_content.league[0];
    const standings = rawStandings.fantasy_content.league[1].standings[0].teams;

    for (const index in standings) {
        if (index === 'count') {
            break;
        }

        const { team } = standings[index];

        const [, , teamName] = team[0];
        const { team_points } = team[1];
        const { team_standings } = team[2];

        parsedStandings.push({
            name: teamName.name,
            points: Number(team_points.total),
            wins: Number(team_standings.outcome_totals.wins),
            losses: Number(team_standings.outcome_totals.losses),
            ties: Number(team_standings.outcome_totals.ties),
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

export const fetchScoreboard = async (accessToken: string, leagueId: string = '1353821') => {
    const scoreboardRequest = await fetch(`https://fantasysports.yahooapis.com/fantasy/v2/league/nfl.l.${leagueId}/scoreboard?format=json`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    const rawScoreboard = await scoreboardRequest.json();

    const parsedScoreboard: ParsedScoreboard[] = [];

    const league = rawScoreboard.fantasy_content.league[0];
    const { matchups } = rawScoreboard.fantasy_content.league[1].scoreboard[0];
    let weekNumber: string = '';

    for (const index in matchups) {
        if (index === 'count') {
            break;
        }

        const {matchup} = matchups[index];
        weekNumber = matchup.week;

        const matchupTeams = matchup[0].teams;

        const team1 = {
            name: matchupTeams[0].team[0][2].name,
            actualPoints: Number(matchupTeams[0].team[1].team_points.total),
            projectedPoints: Number(matchupTeams[0].team[1].team_projected_points.total),
            winProbability: matchupTeams[0].team[1].win_probability
        }

        const team2 = {
            name: matchupTeams[1].team[0][2].name,
            actualPoints: Number(matchupTeams[1].team[1].team_points.total),
            projectedPoints: Number(matchupTeams[1].team[1].team_projected_points.total),
            winProbability: matchupTeams[1].team[1].win_probability
        }

        const key = `week${weekNumber}-${team1.name}-vs-${team2.name}-points`;

        parsedScoreboard.push({
            team1, team2, key
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
    const {scoreboard} = await fetchScoreboard(accessToken);
    const redis = await connect({
        hostname: config.redis.hostname,
    });

    const now = Date.now();
    for (const entry of scoreboard) {
        let currentData: any | null = await redis.get(entry.key);

        if (!currentData) {
            currentData = {
                [entry.team1.name]: [],
                [entry.team2.name]: []
            }
        } else {
            currentData = JSON.parse(currentData);
        }
        
        currentData[entry.team1.name].push([now, entry.team1.actualPoints, entry.team1.winProbability]);
        currentData[entry.team2.name].push([now, entry.team2.actualPoints, entry.team2.winProbability]);

        await redis.set(entry.key, JSON.stringify(currentData));
    }
}

export const listGamesInRedis = async () => {
    const redis = await connect({
        hostname: config.redis.hostname,
    });

    const keys = await redis.keys('week*');

    const games = keys.map(key => {
        const [week, team1, _vs, team2, _points] = key.split('-');
        return {
            week: Number(week.replace('week', '')),
            team1,
            team2,
            key
        }
    });

    return games.sort((a, b) => a.week - b.week);
}

export const getTransactions = async (accessToken: string, leagueId: string = '1353821') => {
    const tradesRequest = await fetch(`https://fantasysports.yahooapis.com/fantasy/v2/league/nfl.l.${leagueId}/transactions;types=add,drop,trade;status=accepted?format=json`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    const rawTrades = await tradesRequest.json();
    const league = rawTrades.fantasy_content.league[0];
    const rawTransactions = rawTrades.fantasy_content.league[1].transactions;
    delete rawTransactions.count;
    const transactionsArr = Object.values(rawTransactions);
    console.log(transactionsArr);

    const transactions = transactionsArr.map((action: any) => {
        const { transaction } = action;
        const { transaction_id: id, type, status, timestamp } = transaction[0];
        const { players } = transaction[1];
        delete players.count;

        const parsedPlayers = Object.values(players).map((p: any) => {
            const { player } = p;
            const [_pKey, _pid, nameInfo, {editorial_team_abbr}, {display_position}, {position_type}] = player[0];

            return {
                name: nameInfo.name.full,
                team: editorial_team_abbr,
                position: display_position,
                transaction_data: player[1].transaction_data
            }
        });

        return {
            id,
            type,
            status,
            timestamp: new Date(Number(timestamp * 1000)),
            players: parsedPlayers
        }
    });

    return {
        league: {
            name: league.name,
            url: league.url,
            logo: league.logo_url,
        }, 
        transactions
    };
}

export const collectTransactions = async () => {
    const accessToken = await getAccessToken();
    const {league, transactions} = await getTransactions(accessToken);
    const redis = await connect({
        hostname: config.redis.hostname,
    });

    for (const transaction of transactions) {
        const {id, type, status, timestamp, players} = transaction;
        const key = `transaction-${league.name}-${id}`;

        const currentData = await redis.get(key);
        if (currentData) {
            continue;
        }

        const data = {
            type,
            status,
            timestamp,
            players
        }

        await redis.set(key, JSON.stringify(data));

        const embed = {
            title: 'New Transaction',
            description: players.map(p => {
                const {name, team, position, transaction_data} = p;
                let type, source_type, destination_type, source, destination;
                if (Array.isArray(transaction_data)) {
                    type = transaction_data[0].type;
                    source_type = transaction_data[0].source_type;
                    destination_type = transaction_data[0].destination_type;
                    if (source_type === 'team') {
                        source = transaction_data[0].source_team_name;
                    } else {
                        source = transaction_data[0].source_type;
                    }
                    if (destination_type === 'team') {
                        destination = transaction_data[0].destination_team_name;
                    } else {
                        destination = transaction_data[0].destination_type;
                    }
                } else {
                    type = transaction_data.type;
                    source_type = transaction_data.source_type;
                    destination_type = transaction_data.destination_type;
                    if (source_type === 'team') {
                        source = transaction_data.source_team_name;
                    } else {
                        source = transaction_data.source_type;
                    }
                    if (destination_type === 'team') {
                        destination = transaction_data.destination_team_name;
                    } else {
                        destination = transaction_data.destination_type;
                    }
                }

                const typeEmoji = type === 'add' ? '🔺' : type === 'drop' ? '🔻' : '🔄';

                return `${name} (${team} - ${position}) ${typeEmoji} ${source} -> ${destination}`;
            }).join('\n'),
            timestamp: timestamp.toISOString(),
        }

        console.log(embed);

        const webhookData = {
            username: league.name,
            avatar_url: league.logo,
            embeds: [embed]
        }

        await fetch(config.yahoo.discordWebhook, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(webhookData)
        }).catch(err => console.error(err));
    }
};