import { Embed, InteractionResponseType, MessageComponentInteraction, MessageComponentOption, SlashCommandInteraction } from 'https://deno.land/x/harmony@v2.1.3/mod.ts'
import { AllWebhookMessageOptions } from "https://deno.land/x/harmony@v2.1.3/src/structures/webhook.ts";
import config from '../config.ts';
import { generatePageButtons, Pageable, paginationPost, setPageablePost } from "../handlers/paginationHandler.ts";
import { v4 } from "https://deno.land/std@0.97.0/uuid/mod.ts";

interface TMDBResult extends Pageable {
    "backdrop_path": string;
    id: number;
    "original_language": string;
    "original_title": string;
    overview: string;
    popularity: number;
    "poster_path": string;
    "release_date": string;
    title: string;
    video: boolean;
    "vote_average": number;
    "vote_count": number;
}

export const fetchMovie = async (interaction: SlashCommandInteraction) => {
    if (!interaction.data) {
        return;
    }

    const titleOption = interaction.data.options.find(option => option.name === 'title');
    const title: string = titleOption ? titleOption.value : '';

    const yearOption = interaction.data.options.find(option => option.name === 'year');
    const year: string = yearOption ? yearOption.value : '';

    await interaction.respond({
        type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE,
    });

    const url = `https://api.themoviedb.org/3/search/movie?api_key=${config.tmdb.apiKey}&language=en-US&query=${title}&page=1&include_adult=false${year ? `&year=${year}`: ''}`;

    const request = await fetch(url);
    const response = await request.json();
    
    const {results}: {results: TMDBResult[]} = response;

    if (results.length > 0) {
        const [movie] = results;
        const internalMessageId = v4.generate();
        const embed = generateTMDBEmbed(movie);

        const pageData: paginationPost<TMDBResult> = {
            pages: results,
            poster: interaction.user.id,
            embedMessage: embed.embeds![0],
            currentPage: 1,
            paginationHandler: tmdbPageHandler,
            pageGenerator: generateTMDBPages,
            interactionData: {}
        }

        const components = [
            ...(results.length > 1 ? generatePageButtons('tmdb', pageData, internalMessageId): []),
        ];
            
        await interaction.send({
            ...embed,
            components
        });

        setPageablePost(internalMessageId, pageData);
    } else {
        await interaction.send('No movies found', {});
    }
}

const tmdbPageHandler = async (interaction: MessageComponentInteraction, pageData: paginationPost<TMDBResult>) =>  {
    const {custom_id: customId} = interaction.data;
    const [_componentId, _commandInvoker, action, messageId] = customId.split('_');

    console.log(customId);
    
    if (action === 'prev' && pageData.currentPage === 1) {
        pageData.currentPage = pageData.pages.length;
    } else if (action === 'prev') {
        pageData.currentPage -= 1;        
    } else if (action === 'next' && pageData.currentPage === pageData.pages.length) {
        pageData.currentPage = 1;
    } else if (action === 'next') {
        pageData.currentPage += 1;
    } else if (action === 'select') {
        const [page] = (interaction.data as any).values;
        pageData.currentPage = parseInt(page);
    }
    
    const page = pageData.pages[pageData.currentPage - 1];
    const newEmbed = generateTMDBEmbed(page);
    const newComponents = [
        ...generatePageButtons('tmdb', pageData, messageId),
    ]

    if (interaction.message) {
        await interaction.editMessage(
            interaction.message, {
                ...newEmbed,
                allowed_mentions: {
                    users: []
                },
                components: newComponents,
            }
        );
    }

    setPageablePost(messageId, pageData);
}

const generateTMDBEmbed = (result: TMDBResult) => {
    const embed = new Embed({
        title: result.title === result.original_title ? result.title : `${result.title} (${result.original_title})`,
        url: `https://www.themoviedb.org/movie/${result.id}`,
        description: result.overview,
        timestamp: result.release_date,
        image: {
            url: result.backdrop_path ? `https://image.tmdb.org/t/p/original/${result.backdrop_path}` : `https://image.tmdb.org/t/p/original/${result.poster_path}`
        },
        footer: {
            text: 'via themoviedb.org'
        },
        color: 0x032541
    });

    const payload: AllWebhookMessageOptions = {
        embeds: [embed],
    };

    return payload;
}

const generateTMDBPages = (pages: TMDBResult[]): MessageComponentOption[] => {
    return pages.map((page, index) => {
        const releaseYear = new Date(page.release_date).getFullYear();
        const releaseYearString = isNaN(releaseYear) ? "None" : `${releaseYear}`;
        
        return {
            label: page.title.length > 97 ? `${page.title.substr(0, 97)}...` : page.title,
            description: `${releaseYearString}`,
            value: `${index + 1}`
        }
    });
}