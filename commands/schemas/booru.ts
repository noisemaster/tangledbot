import { SlashCommandOptionType, SlashCommandPartial } from "https://deno.land/x/harmony@v1.1.4/src/types/slash.ts";

export const E621CommandSchema: SlashCommandPartial = {
    "name": "e621",
    "description": "Fetch a random image from E621 (sends safe images only outside of NSFW channels)",
    "options": [
        {
            "name": "tag",
            "description": "Set of space separated tags to search for (use _ for tags with spaces)",
            "type": SlashCommandOptionType.STRING,
            "required": true,
        },
    ]
}