import { Interaction } from "https://deno.land/x/harmony@v1.0.0/src/structures/slash.ts";
import { InteractionResponseType } from "https://deno.land/x/harmony@v1.0.0/src/types/slash.ts";
import { format } from "https://deno.land/x/date_fns@v2.15.0/index.js";

export const fetchQuote = async (interaction: Interaction) => {
    const symbolOption = interaction.data.options.find(option => option.name === 'symbol');
    const symbol: string = symbolOption ? symbolOption.value : '';

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;

    const stockResp = await fetch(url);
    const stock = await stockResp.json();
    const {result} = stock.chart;

    if (!result) {
        await interaction.respond({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            content: `${symbol} not found`
        });
        return;
    }

    const [{meta: data}] = result;
    const {symbol: returnedSymbol, regularMarketPrice, regularMarketTime} = data;
    const lastRefresh = new Date(regularMarketTime * 1000);
    const lastRefreshFriendly = format(lastRefresh, 'h:mm a z', undefined);
    
    await interaction.respond({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        content: `${returnedSymbol} as of ${lastRefreshFriendly}: ${regularMarketPrice}`
    });
}