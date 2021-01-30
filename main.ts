import { Client, Intents, Interaction } from 'https://deno.land/x/harmony@v1.0.0/mod.ts'
import { sendNFLEmbed } from "./commands/nfl.ts";
import { sendRedditEmbed } from "./commands/reddit.ts";
import { hidePost, isPostHideable, showPost } from "./handlers/imagePostHandler.ts";
import config from './config.ts';
import { sendE621Embed } from "./commands/booru.ts";
import { sendValorantFixtureEmbed } from "./commands/valorant.ts";
import { generateIsThisImage } from "./commands/image/isthis.ts";

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
        case 'e621':
            await sendE621Embed(interaction);
            break;
        case 'valorant':
            await sendValorantFixtureEmbed(interaction);
            break;
        case 'isthis':
            await generateIsThisImage(interaction);
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
