import { Embed, Interaction, InteractionApplicationCommandData, InteractionResponseType, SlashCommandInteraction } from 'https://deno.land/x/harmony@v2.0.0-rc2/mod.ts'
import { AllWebhookMessageOptions } from "https://deno.land/x/harmony@v2.0.0-rc2/src/structures/webhook.ts";
import { sendInteraction } from "./lib/sendInteraction.ts";
import config from '../config.ts';

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

        await interaction.send(payload);
    } else {
        await interaction.send('No movies found');
    }
}