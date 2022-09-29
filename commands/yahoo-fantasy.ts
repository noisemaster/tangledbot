import { ApplicationCommandTypes, Bot, Embed, Interaction, InteractionResponseTypes } from 'discordeno/mod.ts';
import { createCommand } from './mod.ts';
import { getAccessToken, fetchStandings, fetchScoreboard } from "../helpers/yahoo-fantasy/mod.ts";

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