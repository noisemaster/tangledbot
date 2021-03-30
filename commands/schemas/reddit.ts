import { SlashCommandOptionType, SlashCommandPartial } from "https://deno.land/x/harmony@v1.1.4/src/types/slash.ts";

export const RedditCommandSchema: SlashCommandPartial = {
    "name": "reddit",
    "description": "Fetch a random post from Reddit",
    "options": [
        {
            "name": "subreddit",
            "description": "Subreddit to get posts from",
            "type": SlashCommandOptionType.STRING,
            "required": true,
        },
        {
            "name": "image",
            "description": "Get a random image from a subreddit",
            "type": SlashCommandOptionType.BOOLEAN,
            "required": false,
        },
    ]
}
