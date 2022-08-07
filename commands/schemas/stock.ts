import { SlashCommandOptionType, SlashCommandPartial } from "https://deno.land/x/harmony@v2.6.0/mod.ts";

export const StockCommandSchema: SlashCommandPartial = {
    name: "stock",
    description: "Get stock information",
    options: [
        {
            name: 'symbol',
            description: 'Stock Symbol',
            type: SlashCommandOptionType.STRING,
            required: true
        },
        {
            name: 'timerange',
            description: 'Chart time range',
            type: SlashCommandOptionType.STRING,
            choices: [
                { name: "1 Day", value: "1d" },
                { name: "5 Days", value: "5d" },
                { name: "1 Month", value: "1mo" },
                { name: "3 Months", value: "3mo" },
                { name: "6 Months", value: "6mo" },
                { name: "1 Year", value: "1y" },
                { name: "2 Years", value: "2y" },
                { name: "5 Years", value: "5y" },
                { name: "10 Years", value: "10y" },
                { name: "Year to Date", value: "ytd" },
                { name: "Max", value: "max" }
            ],
            required: false
        }
    ]
}