import { SlashCommandOptionType, SlashCommandPartial } from "https://deno.land/x/harmony@v2.0.0-rc1/mod.ts";

export const FrinkiacCommandSchema: SlashCommandPartial = {
    name: "show",
    description: "Fetch an image off of a phrase from a TV show",
    options: [
        {
            name: "show",
            description: "Show to search",
            type: SlashCommandOptionType.STRING,
            required: true,
            choices: [
                {
                    name: "The Simpsons",
                    value: "simpsons"
                },
                {
                    name: "Futurama",
                    value: "futurama"
                }
            ]
        },
        {
            name: "phrase",
            description: "Phrase to lookup",
            required: true,
            type: SlashCommandOptionType.STRING
        },
        {
            name: "type",
            description: "Type of image to get, defaults to frame",
            required: false,
            type: SlashCommandOptionType.STRING,
            choices: [
                {
                    name: "Frame Only",
                    value: "frame"
                },
                {
                    name: "GIF",
                    value: "gif"
                },
                {
                    name: "Subtitle",
                    value: "subtitle"
                }
            ]
        },
        {
            name: "subtitleoverride",
            description: "Custom text for the image, will not work when using Frame only",
            required: false,
            type: SlashCommandOptionType.STRING
        }
    ]
}
