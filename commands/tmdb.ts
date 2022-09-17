import {
    generatePageButtons,
    Pageable,
    paginationPost,
    setPageablePost,
} from "../handlers/paginationHandler.ts";
import { v4 } from "https://deno.land/std@0.97.0/uuid/mod.ts";

import config from "../config.ts";
import {
    ApplicationCommandOptionTypes,
    ApplicationCommandTypes,
    Bot,
    DiscordEmbedField,
    Embed,
    Interaction,
    InteractionResponseTypes,
    SelectOption,
} from "discordeno/mod.ts";
import { createCommand } from "./mod.ts";

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

const fetchMovie = async (bot: Bot, interaction: Interaction) => {
    if (!interaction.data) {
        return;
    }

    const interactionOptions = interaction.data!.options!;

    const titleOption = interactionOptions.find((option) =>
        option.name === "title"
    );
    const title: string = titleOption ? titleOption.value as string : "";

    const yearOption = interactionOptions.find((option) =>
        option.name === "year"
    );
    const year: number = yearOption ? yearOption.value as number : 0;

    await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
        type: InteractionResponseTypes.DeferredChannelMessageWithSource,
    });

    const url =
        `https://api.themoviedb.org/3/search/movie?api_key=${config.tmdb.apiKey}&language=en-US&query=${title}&page=1&include_adult=false${year ? `&year=${year}` : ""
        }`;

    const request = await fetch(url);
    const response = await request.json();

    const { results }: { results: TMDBResult[] } = response;

    if (results.length > 0) {
        const [movie] = results;
        const internalMessageId = v4.generate();
        const embed = await generateTMDBEmbed(movie);

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
                ? generatePageButtons("tmdb", pageData, internalMessageId)
                : []),
        ];

        await bot.helpers.editOriginalInteractionResponse(interaction.token, {
            embeds: [embed],
            components,
        });

        setPageablePost(internalMessageId, pageData);
    } else {
        await bot.helpers.editOriginalInteractionResponse(interaction.token, {
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
    const [_componentId, _commandInvoker, action, messageId] = customId!.split(
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
    const newEmbed = await generateTMDBEmbed(page);
    const newComponents = [
        ...generatePageButtons("tmdb", pageData, messageId),
    ];

    if (interaction.message) {
        await bot.helpers.editOriginalInteractionResponse(
            interaction.token,
            {
                embeds: [newEmbed],
                components: newComponents,
            },
        );
    }

    setPageablePost(messageId, pageData);
};

const generateTMDBEmbed = async (result: TMDBResult) => {
    const fullDetails = await fetch(
        `https://api.themoviedb.org/3/movie/${result.id}?api_key=${config.tmdb.apiKey}`,
    )
        .then((res) => res.json());

    const possibleOptionalFields: DiscordEmbedField[] = [];

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

    const embed: Embed = {
        title: result.title === result.original_title
            ? result.title
            : `${result.title} (${result.original_title})`,
        url: `https://www.themoviedb.org/movie/${result.id}`,
        description: result.overview,
        timestamp: Date.parse(result.release_date),
        image: {
            url: result.backdrop_path
                ? `https://image.tmdb.org/t/p/original/${result.backdrop_path}`
                : `https://image.tmdb.org/t/p/original/${result.poster_path}`,
        },
        fields: [
            {
                name: "Runtime",
                value: fullDetails.runtime > 60
                    ? `${Math.floor(fullDetails.runtime / 60)}h ${fullDetails.runtime % 60
                    }m`
                    : `${fullDetails.runtime}m`,
                inline: false,
            },
            ...possibleOptionalFields,
        ],
        footer: {
            text: "via themoviedb.org",
        },
        color: 0x032541,
    };

    return embed;
};

const generateTMDBPages = (pages: TMDBResult[]): SelectOption[] => {
    return pages.map((page, index) => {
        const releaseYear = new Date(page.release_date).getFullYear();
        const releaseYearString = isNaN(releaseYear) ? "None" : `${releaseYear}`;

        return {
            label: page.title.length > 97
                ? `${page.title.substr(0, 97)}...`
                : page.title,
            description: `${releaseYearString}`,
            value: `${index + 1}`,
        };
    });
};

createCommand({
    name: "movie",
    description: "Lookup a movie",
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
});
