import { ApplicationCommandOptionTypes, ApplicationCommandTypes, Bot, Camelize, DiscordEmbed, Embed, FileContent, Interaction, InteractionCallbackData, InteractionResponseTypes } from '@discordeno/bot';
import { createCommand } from './mod.ts';
import { getAccessToken, fetchStandings, fetchScoreboard, listGames } from "../helpers/yahoo-fantasy/mod.ts";

import Fuse from 'fuse.js'
import config from "../config.ts";
import { updateInteraction } from './lib/updateInteraction.ts';

export const sendStandingsEmbed = async (bot: Bot, interaction: Interaction) => {
    await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
        type: InteractionResponseTypes.DeferredChannelMessageWithSource
    });

    const accessToken = await getAccessToken();
    const { league, standings } = await fetchStandings(accessToken);

    const embed: Camelize<DiscordEmbed> = {
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

    await updateInteraction(interaction, {
        embeds: [embed]
    });
}

export const sendScoreboardEmbed = async (bot: Bot, interaction: Interaction) => {
    await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
        type: InteractionResponseTypes.DeferredChannelMessageWithSource
    });

    const accessToken = await getAccessToken();
    const { league, scoreboard } = await fetchScoreboard(accessToken);

    const embed: Camelize<DiscordEmbed> = {
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

    console.log(embed);

    await updateInteraction(interaction, {
        embeds: [embed]
    }).catch((err) => {
        console.log(err);
    });
}

export const sendScoringGraph = async (bot: Bot, interaction: Interaction) => {
    const interactionData: any = interaction.data;
    const detailsOption = interactionData.options.find((option: any) => option.name === 'graph');
    const searchGameOption: any = detailsOption ? detailsOption.options.find((option: any) => option.name === 'game') : null;
    const searchGame: string = searchGameOption ? searchGameOption.value : '';

    const image = await fetchChart(searchGame).catch((err) => {
        console.log(err);
    });

    const payload: InteractionCallbackData = {
    };

    if (image) {
        const imageAttach: FileContent = {
            name: `${searchGame}.png`,
            blob: new Blob([image])
        };
        payload.files = [imageAttach];
    }

    await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
        type: InteractionResponseTypes.ChannelMessageWithSource,
        data: payload
    });
}

export const handleGraphAutocomplete = async (bot: Bot, interaction: Interaction) => {
    const interactionData: any = interaction.data;
    const detailsOption = interactionData.options.find((option: any) => option.name === 'graph');
    const searchGameOption: any = detailsOption ? detailsOption.options.find((option: any) => option.name === 'game') : null;
    const searchGame: string = searchGameOption ? searchGameOption.value : '';

    const games = await listGames();

    const fuse = new Fuse(games, {
        keys: ['week', 'team1', 'team2', 'key']
    });

    const searchResults = fuse.search(searchGame);

    const formattedResults = searchResults.map(results => ({
        name: `Week ${results.item.week}: ${results.item.team1} vs ${results.item.team2}`,
        value: results.item.key
    })).slice(0, 25);
    
    await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
        type: InteractionResponseTypes.ApplicationCommandAutocompleteResult,
        data: {
            choices: formattedResults
        }
    })
}


const fetchChart = async (
    game: string,
): Promise<ArrayBuffer> => {
    const badger = Bun.spawn({
        cmd: ["python3", "./helpers/scoring.py", game, config.mongo.url],
        stdout: "pipe",
    });

    const output = badger.stdout;
    const code = badger.exitCode;

    if (code !== 0) {
        throw new Error("Chart not generated");
    }

    return new Response(output).arrayBuffer();
};

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
        },
        {
            name: 'graph',
            description: 'View points of a specific game',
            options: [
                {
                    name: 'game',
                    description: 'Game to view point graph for',
                    type: ApplicationCommandOptionTypes.String,
                    autocomplete: true,
                    required: true,
                }
            ],
            execute: sendScoringGraph,
            type: ApplicationCommandTypes.ChatInput,
        }
    ],
    execute: () => {},
});