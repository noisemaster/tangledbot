import { Client, Intents, Interaction } from 'https://deno.land/x/harmony@v0.9.3/mod.ts'
import { sendNFLEmbed } from "./commands/nfl.ts";
import { sendRedditEmbed } from "./commands/reddit.ts";
import { hidePost, isPostHideable, showPost } from "./handlers/imagePostHandler.ts";
import config from './config.ts';

const client = new Client();

client.on('ready', () => {
    console.log(`Ready - ${client.user?.tag}`)
});

client.on('interactionCreate', async (interaction: Interaction) => {
    console.log(interaction.data);

    switch (interaction.data.name) {
        case 'nfl':
            await sendNFLEmbed(interaction);
            break;
        case 'reddit':
            await sendRedditEmbed(interaction);
            break;
        default:
            break;
    }
});

client.on('messageReactionAdd', async (reaction, user) => {
    if (isPostHideable(reaction.message.id)) {
        await hidePost(reaction, user);
    }
});

client.on('messageReactionRemove', async (reaction, user) => {
    if (isPostHideable(reaction.message.id)) {
        await showPost(reaction, user);
    }
});

client.connect(config.discord.token, Intents.All);
