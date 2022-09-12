import { ApplicationCommandOptionTypes, ApplicationCommandTypes, Bot, InteractionResponseTypes, Interaction, DiscordEmbedField, Embed } from "discordeno/mod.ts";
import { sub, differenceInDays } from "https://deno.land/x/date_fns@v2.15.0/index.js";
import { teams } from "../nfl/teams.ts";

// @deno-types="https://deno.land/x/fuse@v6.4.1/dist/fuse.d.ts"
import Fuse from 'https://deno.land/x/fuse@v6.4.1/dist/fuse.esm.min.js'
import { createCommand, subCommand } from "./mod.ts";
// import { autoCompleteCallback } from "./lib/sendInteraction.ts";

interface parsedEvents {
    gameTime: string,
    type: string,
    text: string,
}

const sendNFLScoreboard = async (bot: Bot, interaction: Interaction) => {
    const request = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard');
    const scoreboard = await request.json();

    const scoreboardFields: DiscordEmbedField[] = [];
    const seasonTypeNo = scoreboard.season.type;
    const seasonType = scoreboard.leagues[0].calendar.find((entry: any) => parseInt(entry.value) === seasonTypeNo);
    const seasonWeek = seasonType.entries.find((entry: any) => parseInt(entry.value) === scoreboard.week.number);

    for (const game of scoreboard.events) {
        const gameDate = Date.parse(game.date);
        const now = new Date();
        const aDayAgo = sub(now, {day: 1});

        const visitingTeam = game.competitions[0].competitors.find((team: {homeAway: string}) => team.homeAway === 'away');
		const homeTeam = game.competitions[0].competitors.find((team: {homeAway: string}) => team.homeAway === 'home');
        let scoreString = '';
        let timeString = `<t:${gameDate.valueOf()/1000}>`;
        
        if (now.valueOf() > gameDate.valueOf()) {
            scoreString = visitingTeam.team.abbreviation + " " + visitingTeam.score + " - " + homeTeam.team.abbreviation + " " + homeTeam.score;
            if (game.competitions[0].status.type.state !== "pre" && !game.competitions[0].status.type.completed) {
                const networks = (game.competitions[0]?.broadcasts[0]?.names || []).join(", ");
                timeString = `<:live:668567946997792800> LIVE ${networks} ${networks !== '' ? ':' : ''}`;
            }
        }

        if (scoreString !== "") {
			if (differenceInDays(aDayAgo, gameDate) < 1) {
				scoreString = `${game.status.type.detail}\n||${scoreString}||`
			}
		}

        const scoreboardField: DiscordEmbedField = {
            name: game.name,
            value: `${timeString}\n${scoreString}`.trim(),
            inline: true,
        };

        scoreboardFields.push(scoreboardField);
    }

    const embed: Embed = {
        title: `NFL ${seasonWeek.label}`,
        fields: scoreboardFields
    };

    await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
        type: InteractionResponseTypes.ChannelMessageWithSource,
        data: {
            embeds: [embed]
        }
    })
};

export const sendNFLGameDetails = async (bot: Bot, interaction: Interaction) => {
    const subOptions = interaction.data!.options![0];
    const teamOption = subOptions.options!.find(option => option.name === 'team');
    const selectedTeam: string = teamOption ? (teamOption.value! as string).trim().toLowerCase() : '';

    await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
        type: InteractionResponseTypes.DeferredChannelMessageWithSource
    });


    const request = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard');
    const scoreboard = await request.json();

    const game = scoreboard.events.find((event: any) => {
        return !!event.competitions[0].competitors.find(({team}: any) => team.abbreviation.toLowerCase() === selectedTeam)
    });
    
    if (!game) {
        await bot.helpers.editOriginalInteractionResponse(interaction.token, {
            content: 'Game not found'
        })
        return
    }

    const events = await getGameEvents(game.id).then(results => results.reverse().slice(0, 5));
    const visitingTeam = game.competitions[0].competitors.find((team: {homeAway: string}) => team.homeAway === 'away');
    const homeTeam = game.competitions[0].competitors.find((team: {homeAway: string}) => team.homeAway === 'home');

    const selectedTeamObj = homeTeam.team.abbreviation.toLowerCase() === selectedTeam ? homeTeam : visitingTeam;
    const gameDate = Date.parse(game.date);
    const timeString = `<t:${gameDate.valueOf()/1000}>`;

    console.log(selectedTeamObj.team.color);

    const embed: Embed = {
        title: game.name,
        fields: [
            {
                name: 'Game Start Time',
                value: timeString,
            },
            {
                name: 'Score',
                value: `${visitingTeam.team.abbreviation} ${visitingTeam.score} - ${homeTeam.team.abbreviation} ${homeTeam.score}`,
                inline: true,
            },
            ...(events.length > 0 ? [{
                name: 'Recent Events',
                value: events.map(x => `**${x.gameTime} - ${x.type}**\n${x.text}`).join('\n\n'),
                inline: false
            }] : [])
        ],
        color: parseInt(selectedTeamObj.team.color, 16)
    };
  
    await bot.helpers.editOriginalInteractionResponse(interaction.token, {
        embeds: [embed]
    });
};

// export const handleTeamAutocomplete = async (interaction: MessageComponentInteraction) => {
//     const interactionData: any = interaction.data;
//     const detailsOption = interactionData.options.find((option: any) => option.name === 'details');
//     const searchTeamOption: any = detailsOption ? detailsOption.options.find((option: any) => option.name === 'team') : null;
//     const searchTeam: string = searchTeamOption ? searchTeamOption.value : '';

//     const fuse = new Fuse(teams, {
//         keys: ['name', 'abbr']
//     });

//     const searchResults = fuse.search(searchTeam);

//     const formattedResults = searchResults.map(results => ({
//         name: results.item.name,
//         value: results.item.espnAbbr
//     })).slice(0, 25);

//     await autoCompleteCallback(interaction, formattedResults);
// }

const getGameEvents = async (espnId: string) => {
    const eventUrl = `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/${espnId}/competitions/${espnId}/plays?limit=500`;
    const events: parsedEvents[] = [];

    const eventRequest = await fetch(eventUrl);
    const rawEvents = await eventRequest.json(); 

    for (let event of rawEvents.items) {
        let gameTime = `Quarter ${event.period.number}`;
        if (event.period.number === 0) {
            gameTime = 'Pre Game';
        } else if (event.period.number > 4) {
            gameTime = 'Overtime';
        }

        events.push({
            gameTime,
            text: event.text,
            type: event.type.text,
        })
    }
    
    return events;
}

const thisWeekCommand: subCommand = {
    name: 'this-week',
    description: 'Get this week\'s games',
    execute: sendNFLScoreboard,
    type: ApplicationCommandTypes.Message,
}

const detailsCommand: subCommand = {
    name: 'details',
    description: 'Get details for a team\'s game',
    execute: sendNFLGameDetails,
    type: ApplicationCommandTypes.Message,
    options: [{
        name: "team",
        description: "Team name or abbreviation",
        type: ApplicationCommandOptionTypes.String,
        required: true,
        autocomplete: true
    }]
}

createCommand({
    name: 'nfl',
    description: 'Commands for fetching NFL information',
    type: ApplicationCommandTypes.ChatInput,
    execute: async (_bot, _interaction) => {},
    subcommands: [thisWeekCommand, detailsCommand]
})
