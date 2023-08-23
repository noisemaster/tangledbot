import {
    generatePageButtons,
    Pageable,
    paginationPost,
    setPageablePost,
} from "../handlers/paginationHandler.ts";
import { v4 } from "uuid";

import config from "../config.ts";
import {
    ApplicationCommandOptionTypes,
    ApplicationCommandTypes,
    Bot,
    Camelize,
    DiscordEmbed,
    DiscordEmbedField,
    Embed,
    Interaction,
    InteractionResponseTypes,
    SelectOption,
} from "@discordeno/bot";
import { createCommand } from "./mod.ts";
import { updateInteraction } from "./lib/updateInteraction.ts";

/**
 * @TODO Cleanup logic, there's quite a bit of duplicated logic
 */

interface TMDBResult extends Pageable {
    "backdrop_path": string;
    id: number;
    "original_language": string;
    "name"?: string;
    "original_name"?: string;
    "first_air_date": string;
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

const fetchMovie = async (bot: Bot, interaction: Interaction) => {
    if (!interaction.data) {
        return;
    }

    const type = interaction.data!.name;

    const interactionOptions = interaction.data!.options![0].options!;
    const { title, year } = parseOptions(interactionOptions);

    await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
        type: InteractionResponseTypes.DeferredChannelMessageWithSource,
    });

    const url =
        `https://api.themoviedb.org/3/search/${type}?api_key=${config.tmdb.apiKey}&language=en-US&query=${title}&page=1&include_adult=false${year ? `&year=${year}` : ""
    }`;

    const request = await fetch(url);
    const response = await request.json();

    const { results }: { results: TMDBResult[] } = response;

    if (results.length > 0) {
        const [movie] = results;
        const internalMessageId = v4();
        const embed = await generateMovieEmbed(movie, type);

        const pageData: paginationPost<TMDBResult> = {
            pages: results,
            poster: interaction.user.id,
            embedMessage: embed,
            currentPage: 1,
            paginationHandler: tmdbPageHandler,
            pageGenerator: generateTMDBPages,
            interactionData: {},
        };

        const components = [
            ...(results.length > 1
                ? generatePageButtons(type, pageData, internalMessageId)
                : []),
        ];

        await updateInteraction(interaction, {
            embeds: [embed],
            components,
        });

        setPageablePost(internalMessageId, pageData);
    } else {
        await updateInteraction(interaction, {
            content: "No movies found",
        });
    }
};

const fetchWhereToWatch = async (bot: Bot, interaction: Interaction) => {
    if (!interaction.data) {
        return;
    }

    const type = interaction.data!.name;
    const interactionOptions = interaction.data!.options![0].options!;

    const { title, year } = parseOptions(interactionOptions);

    await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
        type: InteractionResponseTypes.DeferredChannelMessageWithSource,
    });

    const url =
        `https://api.themoviedb.org/3/search/${type}?api_key=${config.tmdb.apiKey}&language=en-US&query=${title}&page=1&include_adult=false${year ? `&year=${year}` : ""
        }`;

    const request = await fetch(url);
    const response = await request.json();

    const { results }: { results: TMDBResult[] } = response;

    if (results.length > 0) {
        const [movie] = results;
        const internalMessageId = v4();
        const embed = await generateWatchEmbed(movie, type);

        const pageData: paginationPost<TMDBResult> = {
            pages: results,
            poster: interaction.user.id,
            embedMessage: embed,
            currentPage: 1,
            paginationHandler: tmdbPageHandler,
            pageGenerator: generateTMDBPages,
            interactionData: {},
        };

        const components = [
            ...(results.length > 1
                ? generatePageButtons(`${type}watch`, pageData, internalMessageId)
                : []),
        ];

        await updateInteraction(interaction, {
            embeds: [embed],
            components,
        });

        setPageablePost(internalMessageId, pageData);
    } else {
        await updateInteraction(interaction, {
            content: "No movies found",
        });
    }
};

const tmdbPageHandler = async (
    bot: Bot,
    interaction: Interaction,
    pageData: paginationPost<TMDBResult>,
) => {
    const { customId } = interaction.data!;
    const [_componentId, invoker, action, messageId] = customId!.split(
        "_",
    );

    console.log(customId);

    if (action === "prev" && pageData.currentPage === 1) {
        pageData.currentPage = pageData.pages.length;
    } else if (action === "prev") {
        pageData.currentPage -= 1;
    } else if (
        action === "next" && pageData.currentPage === pageData.pages.length
    ) {
        pageData.currentPage = 1;
    } else if (action === "next") {
        pageData.currentPage += 1;
    } else if (action === "select") {
        const [page] = (interaction.data as any).values;
        pageData.currentPage = parseInt(page);
    }

    const page = pageData.pages[pageData.currentPage - 1];
    let newEmbed: Camelize<DiscordEmbed>;
    switch (invoker) {
        case "movie":
            newEmbed = await generateMovieEmbed(page, "movie");
            break;
        case "moviewatch":
            newEmbed = await generateWatchEmbed(page, "movie");
            break;
        case "tv":
            newEmbed = await generateMovieEmbed(page, "tv");
            break;
        case "tvwatch":
            newEmbed = await generateWatchEmbed(page, "tv");
            break;
        default:
            newEmbed = await generateMovieEmbed(page, "movie");
            break;
    }

    const newComponents = [
        ...generatePageButtons(invoker, pageData, messageId),
    ];

    if (interaction.message) {
        await updateInteraction(
            interaction,
            {
                embeds: [newEmbed],
                components: newComponents,
            },
        );
    }

    setPageablePost(messageId, pageData);
};

const generateMovieEmbed = async (result: TMDBResult, type: string) => {
    const fullDetails = await fetch(
        `https://api.themoviedb.org/3/${type}/${result.id}?api_key=${config.tmdb.apiKey}`,
    )
        .then((res) => res.json());

    const possibleOptionalFields: DiscordEmbedField[] = [];

    let title = '';

    if (fullDetails.title || fullDetails.original_title) {
        title = fullDetails.title === fullDetails.original_title
            ? fullDetails.title
            : `${fullDetails.title} (${fullDetails.original_title})`;
    }

    if (fullDetails.name || fullDetails.original_name) {
        title = fullDetails.name === fullDetails.original_name
            ? fullDetails.name
            : `${fullDetails.name} (${fullDetails.original_name})`;
    }

    if (fullDetails.production_companies.length > 0) {
        possibleOptionalFields.push({
            name: "Production Companies",
            value: fullDetails.production_companies.map((x: any) => x.name).join(
                "\n",
            ),
            inline: true,
        });
    }

    if (fullDetails.genres.length > 0) {
        possibleOptionalFields.push({
            name: "Genres",
            value: fullDetails.genres.map((x: any) => x.name).join("\n"),
            inline: true,
        });
    }
    
    if (fullDetails.runtime) {
        possibleOptionalFields.push({
            name: "Runtime",
            value: fullDetails.runtime > 60
                ? `${Math.floor(fullDetails.runtime / 60)}h ${fullDetails.runtime % 60}m`
                : `${fullDetails.runtime}m`,
            inline: false,
        });
    }

    if (fullDetails.number_of_seasons) {
        possibleOptionalFields.push({
            name: "Run",
            value: `${fullDetails.number_of_episodes} ${
                fullDetails.number_of_episodes === 1 ? "episode" : "episodes"
            } in ${fullDetails.number_of_seasons} ${
                fullDetails.number_of_seasons === 1 ? "season" : "seasons"
            }`,
            inline: false,
        });
    }

    const embed: Camelize<DiscordEmbed> = {
        title,
        url: `https://www.themoviedb.org/${type}/${result.id}`,
        description: result.overview,
        timestamp: new Date(Date.parse(result.release_date || fullDetails.first_air_date)).toISOString(),
        image: {
            url: result.backdrop_path
                ? `https://image.tmdb.org/t/p/original/${result.backdrop_path}`
                : `https://image.tmdb.org/t/p/original/${result.poster_path}`,
        },
        fields: [
            ...possibleOptionalFields,
        ],
        footer: {
            text: "via themoviedb.org",
        },
        color: 0x032541,
    };

    return embed;
};

const generateWatchEmbed = async (result: TMDBResult, type: string) => {
    const fullDetails = await fetch(
        `https://api.themoviedb.org/3/${type}/${result.id}?api_key=${config.tmdb.apiKey}`,
    )
        .then((res) => res.json());

    const providers = await fetch(
        `https://api.themoviedb.org/3/${type}/${result.id}/watch/providers?api_key=${config.tmdb.apiKey}`,
    )   .then((res) => res.json());

    const possibleOptionalFields: DiscordEmbedField[] = [];

    const providerRegion = providers.results.US;

    let title = '';

    if (result.title || result.original_title) {
        title = result.title === result.original_title
            ? result.title
            : `${result.title} (${result.original_title})`;
    }

    if (result.name || result.original_name) {
        title = result.name! === result.original_name!
            ? result.name
            : `${result.name} (${result.original_name})`;
    }


    if (providerRegion?.flatrate?.length > 0) {
        possibleOptionalFields.push({
            name: "Streaming",
            value: providerRegion.flatrate.map((x: any) => `- ${x.provider_name}`).join("\n",),
            inline: true,
        });
    }

    if (providerRegion?.rent?.length > 0) {
        possibleOptionalFields.push({
            name: "Rent",
            value: providerRegion.rent.map((x: any) => `- ${x.provider_name}`).join("\n",),
            inline: true,
        });
    }

    if (providerRegion?.buy?.length > 0) {
        possibleOptionalFields.push({
            name: "Buy",
            value: providerRegion.buy.map((x: any) => `- ${x.provider_name}`).join("\n",),
            inline: true,
        });
    }

    if (fullDetails.runtime) {
        possibleOptionalFields.push({
            name: "Runtime",
            value: fullDetails.runtime > 60
                ? `${Math.floor(fullDetails.runtime / 60)}h ${fullDetails.runtime % 60}m`
                : `${fullDetails.runtime}m`,
            inline: false,
        });
    }

    if (fullDetails.number_of_seasons) {
        possibleOptionalFields.push({
            name: "Run",
            value: `${fullDetails.number_of_episodes} ${
                fullDetails.number_of_episodes === 1 ? "episode" : "episodes"
            } in ${fullDetails.number_of_seasons} ${
                fullDetails.number_of_seasons === 1 ? "season" : "seasons"
            }`,
            inline: false,
        });
    }

    const embed: Camelize<DiscordEmbed> = {
        title,
        url: `https://www.themoviedb.org/${type}/${result.id}`,
        timestamp: new Date(Date.parse(result.release_date || result.first_air_date)).toISOString(),
        image: {
            url: result.backdrop_path
                ? `https://image.tmdb.org/t/p/original/${result.backdrop_path}`
                : `https://image.tmdb.org/t/p/original/${result.poster_path}`,
        },
        fields: [
            ...possibleOptionalFields,
        ],
        footer: {
            text: "via themoviedb.org & justwatch.com",
        },
        color: 0x032541,
    };

    return embed;
};

const generateTMDBPages = (pages: TMDBResult[]): SelectOption[] => {
    return pages.map((page, index) => {
        const releaseYear = new Date(page.release_date || page.first_air_date).getFullYear();
        const releaseYearString = isNaN(releaseYear) ? "None" : `${releaseYear}`;

        if (page.title) {
            return {
                label: page.title.length > 97
                ? `${page.title.substr(0, 97)}...`
                : page.title,
                description: `${releaseYearString}`,
                value: `${index + 1}`,
            };
        } else {
            return {
                label: page.name!.length > 97
                    ? `${page.name!.substr(0, 97)}...`
                    : page.name!,
                description: `${releaseYearString}`,
                value: `${index + 1}`,
            };
        }
    });
};

createCommand({
    name: 'movie',
    description: "Lookup movie info",
    type: ApplicationCommandTypes.ChatInput,
    execute: () => {},
    subcommands: [
        {
            name: "search",
            description: "Search for movies",
            type: ApplicationCommandTypes.ChatInput,
            execute: fetchMovie,
            options: [
                {
                    name: "title",
                    description: "Movie Title",
                    type: ApplicationCommandOptionTypes.String,
                    required: true,
                },
                {
                    name: "year",
                    description: "Release Year",
                    type: ApplicationCommandOptionTypes.Integer,
                    required: false,
                },
            ],
        },
        {
            name: "watch",
            description: "Find where to watch a movie",
            type: ApplicationCommandTypes.ChatInput,
            execute: fetchWhereToWatch,        
            options: [
                {
                    name: "title",
                    description: "Movie Title",
                    type: ApplicationCommandOptionTypes.String,
                    required: true,
                },
                {
                    name: "year",
                    description: "Release Year",
                    type: ApplicationCommandOptionTypes.Integer,
                    required: false,
                },
            ],
        }
    ]
});

createCommand({
    name: 'tv',
    description: "Lookup TV info",
    type: ApplicationCommandTypes.ChatInput,
    execute: () => {},
    subcommands: [
        {
            name: "search",
            description: "Search for TV shows",
            type: ApplicationCommandTypes.ChatInput,
            execute: fetchMovie,
            options: [
                {
                    name: "title",
                    description: "Title",
                    type: ApplicationCommandOptionTypes.String,
                    required: true,
                },
                {
                    name: "year",
                    description: "Release Year",
                    type: ApplicationCommandOptionTypes.Integer,
                    required: false,
                },
            ],
        },
        {
            name: "watch",
            description: "Find where to watch a TV show",
            type: ApplicationCommandTypes.ChatInput,
            execute: fetchWhereToWatch,        
            options: [
                {
                    name: "title",
                    description: "Title",
                    type: ApplicationCommandOptionTypes.String,
                    required: true,
                },
                {
                    name: "year",
                    description: "Release Year",
                    type: ApplicationCommandOptionTypes.Integer,
                    required: false,
                },
            ],
        }
    ]
});

const parseOptions = (interactionOptions: any) => {
  const titleOption = interactionOptions.find((option: {name: string}) => option.name === "title");
  const title: string = titleOption ? titleOption.value as string : "";

  const yearOption = interactionOptions.find((option: {name: string}) => option.name === "year");
  const year: number = yearOption ? yearOption.value as number : 0;

  return { title, year };
}
