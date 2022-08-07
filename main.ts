import { Client, event, Intents, InteractionType, MessageComponentInteraction, slash, SlashCommandInteraction, subslash } from 'https://deno.land/x/harmony@v2.6.0/mod.ts'
import { handleTeamAutocomplete, sendNFLEmbed, sendNFLGameDetails } from "./commands/nfl.ts";
import { sendRedditEmbed } from "./commands/reddit.ts";
import { togglePost } from "./handlers/imagePostHandler.ts";
import config from './config.ts';
import { sendE621Embed } from "./commands/booru.ts";
import { sendValorantFixtureEmbed } from "./commands/valorant.ts";
import { generateIsThisImage } from "./commands/image/isthis.ts";
import { sendShowEmbed } from "./commands/frinkiac.ts";
import { fetchQuote } from "./commands/stock.ts";
import { fetchMovie } from "./commands/tmdb.ts";
import { sendCryptoEmbed } from "./commands/crypto.ts";
import { GlobalCommandSchemas } from './commands/schemas/index.ts';
import { updatePage } from "./handlers/paginationHandler.ts";
import { updateTimerange } from "./handlers/timerangeHandler.ts";

class TangledClient extends Client {
    @event() ready() {
        console.log(`Ready - ${client.user?.tag}`);
    }

    @subslash('nfl', 'this-week') async nflThisWeek(interaction: SlashCommandInteraction) {
        await sendNFLEmbed(interaction)
            .catch(err => console.log(err));
    }

    @subslash('nfl', 'details') async nflGameDetails(interaction: SlashCommandInteraction) {
        await sendNFLGameDetails(interaction)
            .catch(err => console.log(err));
    }

    @slash() async reddit(interaction: SlashCommandInteraction) {
        await sendRedditEmbed(interaction)
            .catch(err => console.log(err));
    }

    @slash() async e621(interaction: SlashCommandInteraction) {
        await sendE621Embed(interaction)
            .catch(err => console.log(err));
    }

    @slash() async valorant(interaction: SlashCommandInteraction) {
        await sendValorantFixtureEmbed(interaction)
            .catch(err => console.log(err));
    }

    @slash() async isthis(interaction: SlashCommandInteraction) {
        await generateIsThisImage(interaction)
            .catch(err => console.log(err));
    }

    @slash() async show(interaction: SlashCommandInteraction) {
        await sendShowEmbed(interaction)
            .catch(err => console.log(err));
    }

    @slash() async stock(interaction: SlashCommandInteraction) {
        await fetchQuote(interaction)
            .catch(err => console.log(err));
    }

    @slash() async movie(interaction: SlashCommandInteraction) {
        await fetchMovie(interaction)
            .catch(err => console.log(err));
    }

    @slash() async crypto(interaction: SlashCommandInteraction) {
        await sendCryptoEmbed(interaction)
            .catch(err => console.log(err));
    }

    @event() async interactionCreate(interaction: MessageComponentInteraction) {
        try {
            if (interaction.type === InteractionType.MESSAGE_COMPONENT && interaction.data) {
                const { custom_id: customId } = interaction.data;
        
                    if (customId.startsWith('hideable_')) {
                        await togglePost(interaction);
                    }
                    
                    if (customId.startsWith('pageable_')) {
                        await updatePage(interaction);
                    }
        
                    if (customId.startsWith('timerange_')) {
                        await updateTimerange(interaction);
                    }
            //@ts-ignore Autocomplete Interaction Type
            } else if (interaction.type === 4) {
                const interactionData: any = interaction.data;

                if (interactionData.name === 'nfl') {
                    await handleTeamAutocomplete(interaction);
                }
            }
        } catch (err) {
            // console.log(interaction);
            console.log(err);
        }
    }
}

const client = new TangledClient();

client.connect(config.discord.token, Intents.NonPrivileged);
