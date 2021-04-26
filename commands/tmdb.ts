import { Interaction } from "https://deno.land/x/harmony@v1.1.5/src/structures/slash.ts";
import { InteractionResponseType } from "https://deno.land/x/harmony@v1.1.5/src/types/slash.ts";
import { Embed } from "https://deno.land/x/harmony@v1.1.5/src/structures/embed.ts";
import { AllWebhookMessageOptions } from "https://deno.land/x/harmony@v1.1.5/src/structures/webhook.ts";
import { sendInteraction } from "./lib/sendInteraction.ts";
import config from '../config.ts';

export const fetchMovie = async (interaction: Interaction) => {
    const titleOption = interaction.data.options.find(option => option.name === 'title');
    const title: string = titleOption ? titleOption.value : '';

    const yearOption = interaction.data.options.find(option => option.name === 'year');
    const year: string = yearOption ? yearOption.value : '';

    await interaction.respond({
        type: InteractionResponseType.ACK_WITH_SOURCE,
    });

    const url = `https://api.themoviedb.org/3/search/movie?api_key=${config.tmdb.apiKey}&language=en-US&query=${title}&page=1&include_adult=false${year ? `&year=${year}`: ''}`;

    const request = await fetch(url);
    const response = await request.json();

    const {results} = response;

    if (results.length > 0) {
        const [movie] = results;

        const embed = new Embed({
            title: movie.title === movie.original_title ? movie.title : `${movie.title} (${movie.original_title})`,
            url: `https://www.themoviedb.org/movie/${movie.id}`,
            description: movie.overview,
            timestamp: movie.release_date,
            image: {
                url: movie.backdrop_path ? `https://image.tmdb.org/t/p/original/${movie.backdrop_path}` : `https://image.tmdb.org/t/p/original/${movie.poster_path}`
            },
            footer: {
                text: 'via themoviedb.org'
            },
            color: 0x032541
        });

        const payload: AllWebhookMessageOptions = {
            embeds: [embed],
        };

        await sendInteraction(interaction, payload);
    } else {
        await sendInteraction(interaction, 'No movies found');
    }
}