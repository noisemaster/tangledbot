import { Embed, InteractionResponseType, SlashCommandInteraction } from 'https://deno.land/x/harmony@v2.0.0-rc2/mod.ts'
import { EmbedField } from "https://deno.land/x/harmony@v2.0.0-rc2/src/types/channel.ts";
import { sub, differenceInDays, format } from "https://deno.land/x/date_fns@v2.15.0/index.js";

export const sendNFLEmbed = async (interaction: SlashCommandInteraction) => {
    const request = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard');
    const scoreboard = await request.json();

    const scoreboardFields: EmbedField[] = [];

    for (const game of scoreboard.events) {
        const gameDate = Date.parse(game.date);
        const now = new Date();
        const aDayAgo = sub(now, {day: 1});

        const visitingTeam = game.competitions[0].competitors.find((team: {homeAway: string}) => team.homeAway === 'away');
		const homeTeam = game.competitions[0].competitors.find((team: {homeAway: string}) => team.homeAway === 'home');
        let scoreString = '';
        let timeString = `${format(gameDate, 'MMMM d, yyyy h:mma', undefined)} (Eastern)`;
        
        if (now.valueOf() > gameDate.valueOf()) {
            scoreString = visitingTeam.team.abbreviation + " " + visitingTeam.score + " - " + homeTeam.team.abbreviation + " " + homeTeam.score;
            if (game.competitions[0].status.type.state !== "pre" && !game.competitions[0].status.type.completed) {
                const networks = game.competitions[0].broadcasts[0].names.join(", ")
                timeString = "<:live:668567946997792800> LIVE " + networks + ":"
            }
        }

        if (scoreString !== "") {
			if (differenceInDays(aDayAgo, gameDate) < 1) {
				scoreString = `${game.status.type.detail}\n||${scoreString}||`
			}
		}

        const scoreboardField: EmbedField = {
            name: game.name,
            value: `${timeString}\n${scoreString}`.trim(),
            inline: true,
        };

        scoreboardFields.push(scoreboardField);
    }

    const embed = new Embed({
        title: `NFL Week ${scoreboard.week.number}`,
        fields: scoreboardFields
    });

    await interaction.respond({
        embeds: [embed],
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE
    });
};