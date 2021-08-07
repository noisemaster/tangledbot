import { Client, Intents, Interaction, InteractionApplicationCommandData, InteractionType, MessageComponentInteraction, SlashCommandInteraction } from 'https://deno.land/x/harmony@v2.0.0-rc2/mod.ts'
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
import { sendCryptoEmbed } from "./commands/crypto.ts";
import { logInteraction } from "./commands/lib/log.ts";
import { GlobalCommandSchemas } from './commands/schemas/index.ts';
import { updatePage } from "./handlers/paginationHandler.ts";
import { updateTimerange } from "./handlers/timerangeHandler.ts";

const client = new Client();

client.on('ready', async () => {
    console.log(`Ready - ${client.user?.tag}`);

    // const id = client.applicationID || '';

    // await client.rest.api.applications[id].commands.put(GlobalCommandSchemas);
    // console.log(`Synced ${GlobalCommandSchemas.length} slash commands with Discord`);
});

client.on('interactionCreate', async (interaction: Interaction) => {
    if (interaction.type === InteractionType.APPLICATION_COMMAND && interaction.data) {
        const slashInteraction = interaction as SlashCommandInteraction;

        try {
            switch (slashInteraction.data.name) {
                case 'nfl':
                    await sendNFLEmbed(slashInteraction);
                    break;
                case 'reddit':
                    await sendRedditEmbed(slashInteraction);
                    break;
                case 'e621':
                    await sendE621Embed(slashInteraction);
                    break;
                case 'valorant':
                    await sendValorantFixtureEmbed(slashInteraction);
                    break;
                case 'isthis':
                    await generateIsThisImage(slashInteraction);
                    break;
                case 'show':
                    await sendShowEmbed(slashInteraction);
                    break;
                case 'stock':
                    await fetchQuote(slashInteraction);
                    break;
                case 'movie':
                    await fetchMovie(slashInteraction);
                    break;
                case 'crypto':
                    await sendCryptoEmbed(slashInteraction);
                    break;
                default:
                    break;
            }
        } catch (err) {
            // console.log(slashInteraction);
            console.log(err);
        }
    }

    // Component Responses
    if (interaction.type === InteractionType.MESSAGE_COMPONENT && interaction.data) {
        const componentInteraction = interaction as MessageComponentInteraction;
        const { custom_id: customId } = componentInteraction.data;

        try {
            if (customId.startsWith('hideable_')) {
                await togglePost(componentInteraction);
            }
            
            if (customId.startsWith('pageable_')) {
                await updatePage(componentInteraction);
            }

            if (customId.startsWith('timerange_')) {
                await updateTimerange(componentInteraction);
            }
        } catch (err) {
            // console.log(componentInteraction);
            console.log(err);
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
