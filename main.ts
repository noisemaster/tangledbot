import { Client, Intents, Interaction, InteractionType } from 'https://deno.land/x/harmony@v2.0.0-rc1/mod.ts'
import { sendNFLEmbed } from "./commands/nfl.ts";
import { sendRedditEmbed } from "./commands/reddit.ts";
import { hidePost, isPostHideable, showPost, togglePost } from "./handlers/imagePostHandler.ts";
import config from './config.ts';
import { sendE621Embed } from "./commands/booru.ts";
import { sendValorantFixtureEmbed } from "./commands/valorant.ts";
import { generateIsThisImage } from "./commands/image/isthis.ts";
import { sendShowEmbed } from "./commands/frinkiac.ts";
import { fetchQuote } from "./commands/stock.ts";
import { fetchMovie } from "./commands/tmdb.ts";
import { logInteraction } from "./commands/lib/log.ts";
import { GlobalCommandSchemas } from './commands/schemas/index.ts';

const client = new Client();

client.on('ready', async () => {
    console.log(`Ready - ${client.user?.tag}`);

    // const id = client.applicationID || '';

    // await client.rest.api.applications[id].commands.put(GlobalCommandSchemas);
    // console.log(`Synced ${GlobalCommandSchemas.length} slash commands with Discord`);
});

client.on('interactionCreate', async (interaction: Interaction) => {
    if (interaction.type === InteractionType.APPLICATION_COMMAND && interaction.data) {
        try {
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
                case 'show':
                    await sendShowEmbed(interaction);
                    break;
                case 'stock':
                    await fetchQuote(interaction);
                    break;
                case 'movie':
                    await fetchMovie(interaction);
                    break;
                default:
                    break;
            }
        } catch (err) {
            console.log(interaction);
            console.log(err);
        }
    }

    // Button Responses
    if (interaction.type === 3 && interaction.data) {
        console.log(interaction);
        const {custom_id: customId} = interaction.data as unknown as {custom_id: string}; /// @ts-ignore Harmony currently lacks Button information
        if (customId.startsWith('hideable_')) {
            await togglePost(interaction);
        }
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

client.connect(config.discord.token, Intents.NonPrivileged);
