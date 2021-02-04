import { Interaction } from "https://deno.land/x/harmony@v1.0.0/src/structures/slash.ts";
import { InteractionResponseType } from "https://deno.land/x/harmony@v1.0.0/src/types/slash.ts";
import { parse, format } from "https://deno.land/x/date_fns@v2.15.0/index.js";
import config from "../config.ts";

export const fetchQuote = async (interaction: Interaction) => {
    const symbolOption = interaction.data.options.find(option => option.name === 'symbol');
    const symbol: string = symbolOption ? symbolOption.value : '';

    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=5min&apikey=${config.alphaVantage}`;

    const stockResp = await fetch(url);
    const stock = await stockResp.json();

    if (!stock) {
        await interaction.respond({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            content: `${symbol} not found`
        });
        return;
    }

    const meta = stock['Meta Data'];
    const lastRefresh = meta['3. Last Refreshed'];

    const timeline = stock['Time Series (5min)'];
    const frame = timeline[lastRefresh];

    const lastRefreshObj = parse(lastRefresh, 'yyyy-MM-dd HH:mm:ss', new Date(), undefined);
    const lastRefreshFriendly = format(lastRefreshObj, 'h:mm a z', undefined);

    await interaction.respond({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        content: `${symbol} as of ${lastRefreshFriendly}: ${parseFloat(frame['4. close'])}`
    });
}