import { SlashCommandOptionType, SlashCommandPartial } from "https://deno.land/x/harmony@v2.6.0/mod.ts";

export const CryptoCommandSchema: SlashCommandPartial = {
    name: "crypto",
    description: "Get cryptocurrency information",
    options: [
        {
            name: 'symbol',
            description: 'Coin Symbol',
            type: SlashCommandOptionType.STRING,
            required: true
        },
        {
            name: 'timerange',
            description: 'Chart time range',
            type: SlashCommandOptionType.STRING,
            choices: [
                { name: "1 Day", value: "1" },
                { name: "7 Days", value: "7" },
                { name: "2 Weeks", value: "14" },
                { name: "1 Month", value: "30" },
                { name: "3 Months", value: "90" },
                { name: "6 Months", value: "180" },
                { name: "1 Year", value: "365" },
                { name: "Max", value: "max" }
            ],
            required: false
        }
    ]
}