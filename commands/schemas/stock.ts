import { SlashCommandOptionType, SlashCommandPartial } from "https://deno.land/x/harmony@v1.0.0/src/types/slash.ts";

export const StockCommandSchema: SlashCommandPartial = {
    name: "stock",
    description: "Get stock information",
    options: [
        {
            name: 'symbol',
            description: 'Stock Symbol',
            type: SlashCommandOptionType.STRING,
            required: true
        }
    ]
}