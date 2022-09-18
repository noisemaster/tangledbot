import { ApplicationCommandTypes, Bot, Embed, Interaction, InteractionResponseTypes } from 'discordeno/mod.ts';
import { connect } from 'redis/mod.ts';
import { encode } from "https://deno.land/std@0.154.0/encoding/base64.ts";
import config from '../config.ts';
import { createCommand } from './mod.ts';

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
    team2: ScoreboardTeam
}

const getAccessToken = async () => {
    const redis = await connect({
        hostname: '127.0.0.1'
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

const fetchStandings = async (accessToken: string, leagueId: string = '1353821') => {
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

const fetchScoreboard = async (accessToken: string, leagueId: string = '1353821') => {
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

        parsedScoreboard.push({
            team1, team2
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

const sendStandingsEmbed = async (bot: Bot, interaction: Interaction) => {
    await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
        type: InteractionResponseTypes.DeferredChannelMessageWithSource
    });

    const accessToken = await getAccessToken();
    const { league, standings } = await fetchStandings(accessToken);

    const embed: Embed = {
        author: {
            name: league.name,
            url: league.url,
            iconUrl: league.logo
        }
    };
    embed.fields = standings.map((data, index) => {
        return {
            name: `${index + 1}: ${data.name}`,
            value: `${data.points} (${data.wins} - ${data.losses}${data.ties ? ` - ${data.ties}` : ''})`,
            inline: false,
        };
    })

    await bot.helpers.editOriginalInteractionResponse(interaction.token, {
        embeds: [embed]
    });
}

const sendScoreboardEmbed = async (bot: Bot, interaction: Interaction) => {
    await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
        type: InteractionResponseTypes.DeferredChannelMessageWithSource
    });

    const accessToken = await getAccessToken();
    const { league, scoreboard } = await fetchScoreboard(accessToken);

    const embed: Embed = {
        author: {
            name: league.name,
            url: league.url,
            iconUrl: league.logo
        },
        title: `Week ${league.week}`
    };
    embed.fields = scoreboard.map((data, index) => {
        return {
            name: `Matchup ${index+1}`,
            value: `${data.team1.name}: ${data.team1.actualPoints} (Projected: ${data.team1.projectedPoints}) - Win Probability ${(data.team1.winProbability * 100).toFixed(0)}%\n${data.team2.name}: ${data.team2.actualPoints} (Projected: ${data.team2.projectedPoints}) - Win Probability ${(data.team2.winProbability * 100).toFixed(0)}%`,
            inline: false,
        };
    });

    await bot.helpers.editOriginalInteractionResponse(interaction.token, {
        embeds: [embed]
    });
}

createCommand({
    name: 'fantasy',
    description: 'View Yahoo Fantasy details',
    type: ApplicationCommandTypes.ChatInput,
    subcommands: [
        {
            name: 'standings',
            description: 'View league standings',
            execute: sendStandingsEmbed,
            type: ApplicationCommandTypes.ChatInput
        },
        {
            name: 'scoreboard',
            description: 'View league scoreboard',
            execute: sendScoreboardEmbed,
            type: ApplicationCommandTypes.ChatInput
        }
    ],
    execute: () => { },
});