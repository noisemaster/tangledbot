import { SlashCommandOptionType, SlashCommandPartial } from "https://deno.land/x/harmony@v2.1.3/mod.ts";

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