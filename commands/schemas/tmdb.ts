import { SlashCommandOptionType, SlashCommandPartial } from "https://deno.land/x/harmony@v1.1.5/src/types/slash.ts";

export const MovieCommandSchema: SlashCommandPartial = {
    "name": "movie",
    "description": "Lookup a movie",
    "options": [
        {
            "name": "title",
            "description": "Movie Title",
            "type": SlashCommandOptionType.STRING,
            "required": true,
        },
        {
            "name": "year",
            "description": "Release Year",
            "type": SlashCommandOptionType.INTEGER,
            "required": false,
        },
    ]
}