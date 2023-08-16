import { ApplicationCommandOptionTypes, ApplicationCommandTypes, Bot, Embed, FileContent, Interaction, InteractionCallbackData, InteractionResponseTypes } from 'discordeno/mod.ts';
import { createCommand } from './mod.ts';
import { getAccessToken, fetchStandings, fetchScoreboard, listGamesInRedis, listGames } from "../helpers/yahoo-fantasy/mod.ts";

// @deno-types="https://deno.land/x/fuse@v6.4.1/dist/fuse.d.ts"
import Fuse from 'https://deno.land/x/fuse@v6.4.1/dist/fuse.esm.min.js'

export const sendStandingsEmbed = async (bot: Bot, interaction: Interaction) => {
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

export const sendScoreboardEmbed = async (bot: Bot, interaction: Interaction) => {
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
        payload.file = imageAttach;
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
): Promise<Uint8Array> => {
    const badger = Deno.run({
        cmd: ["python3", "./helpers/scoring.py", game],
        stdout: "piped",
    });

    const output = await badger.output();
    const { code } = await badger.status();

    if (code !== 0) {
        throw new Error("Chart not generated");
    }

    return output;
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