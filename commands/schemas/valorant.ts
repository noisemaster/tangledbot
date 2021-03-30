import { SlashCommandOptionType, SlashCommandPartial } from "https://deno.land/x/harmony@v1.1.4/src/types/slash.ts";

export const ValorantCommandSchema: SlashCommandPartial = {
    "name": "valorant",
    "description": "View the schedule of Valorant matches (via valorantesports.com)",
    "options": [
        {
            "name": "region",
            "description": "Match region",
            "type": SlashCommandOptionType.STRING,
            "required": true,
            "choices": [
                {
                    "name": "North America",
                    "value": "105555635175479654"
                }
            ]
        }
    ]
}
