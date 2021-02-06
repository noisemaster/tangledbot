import { Interaction } from "https://deno.land/x/harmony@v1.0.0/src/structures/slash.ts";
import { InteractionResponseType } from "https://deno.land/x/harmony@v1.0.0/src/types/slash.ts";
import { format } from "https://deno.land/x/date_fns@v2.15.0/index.js";
import { Embed } from "https://deno.land/x/harmony@v1.0.0/src/structures/embed.ts";

export const fetchQuote = async (interaction: Interaction) => {
    const symbolOption = interaction.data.options.find(option => option.name === 'symbol');
    const symbol: string = symbolOption ? symbolOption.value : '';

    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`

    const stockResp = await fetch(url);
    const stock = await stockResp.json();
    const {result} = stock.quoteResponse;

    if (result.length === 0) {
        await interaction.respond({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            content: `${symbol} not found`
        });
        return;
    }

    const [data] = result;
    const {symbol: returnedSymbol, quoteType, startDate, coinImageUrl, fromCurrency, longName, shortName, regularMarketPrice, regularMarketChange, regularMarketChangePercent, regularMarketTime} = data;
    const lastRefresh = new Date(regularMarketTime * 1000);
    const lastRefreshFormat = format(lastRefresh, "yyyy-MM-dd'T'HH:mm:ssxxx", undefined);
    const diffSymbol = regularMarketChange > 0 ? '🔺' : '🔻';
    const diffColor = regularMarketChange > 0 ? 0x44bd32 : 0xe74c3c;

    const stockEmbed = new Embed({
        title: `${longName || shortName} (${returnedSymbol})`,
        timestamp: lastRefreshFormat,
        color: diffColor
    });

    if (quoteType === 'CRYPTOCURRENCY') {
        stockEmbed.setAuthor({
            icon_url: coinImageUrl,
            name: fromCurrency
        });
        stockEmbed.setDescription(`${regularMarketPrice}\n${diffSymbol} ${Math.abs(regularMarketChange)} (${regularMarketChangePercent.toFixed(2)}%)`);
    } else {
        stockEmbed.setDescription(`${regularMarketPrice.toFixed(2)}\n${diffSymbol} ${Math.abs(regularMarketChange.toFixed(2))} (${regularMarketChangePercent.toFixed(2)}%)`);
    }

    await interaction.respond({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        embeds: [stockEmbed]
    });
}