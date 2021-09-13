import { SlashCommandOptionType, SlashCommandPartial } from "https://deno.land/x/harmony@v2.1.3/mod.ts";

export const NFLCommandSchema: SlashCommandPartial = {
    name: "nfl",
    description: "NFL game information",
    options: [
        {
            type: SlashCommandOptionType.SUB_COMMAND,
            name: 'this-week',
            description: 'Get this week\'s games'
        },
        {
            type: SlashCommandOptionType.SUB_COMMAND,
            name: 'details',
            description: 'Get details for a team\'s game',
            options: [{
                name: "team",
                description: "Team abbreviation | (WSH = Washington Football Team)",
                type: SlashCommandOptionType.STRING,
                required: true,
            }]
        }
    ]
}