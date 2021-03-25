import { Interaction } from "https://deno.land/x/harmony@v1.1.4/src/structures/slash.ts";
import { InteractionResponseType } from "https://deno.land/x/harmony@v1.1.4/src/types/slash.ts";
import { format } from "https://deno.land/x/date_fns@v2.15.0/index.js";
import { Embed } from "https://deno.land/x/harmony@v1.1.4/src/structures/embed.ts";
import { MessageAttachment } from "https://deno.land/x/harmony@v1.1.4/mod.ts";
import { AllWebhookMessageOptions } from "https://deno.land/x/harmony@v1.1.4/src/structures/webhook.ts";

export const fetchQuote = async (interaction: Interaction) => {
    const symbolOption = interaction.data.options.find(option => option.name === 'symbol');
    const symbol: string = symbolOption ? symbolOption.value : '';

    const timeRangeOption = interaction.data.options.find(option => option.name === 'timerange');
    const timeRange: string = timeRangeOption ? timeRangeOption.value : '1d';

    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`

    let stockResp = await fetch(url);
    let stock = await stockResp.json();
    let {result} = stock.quoteResponse;

    await interaction.respond({
        type: InteractionResponseType.ACK_WITH_SOURCE,
    });

    if (result.length === 0 || (result[0].quoteType === 'MUTUALFUND' && !result[0].marketCap)) {
        stockResp = await fetch(url + '-USD');
        stock = await stockResp.json();
        result = stock.quoteResponse.result;

        if (result.length === 0) {
            await interaction.send(`${symbol} not found`);
            return;
        }
    }

    const [data] = result;
    const {symbol: returnedSymbol, exchange, quoteType, coinImageUrl, fromCurrency, longName, shortName, regularMarketPrice, regularMarketChange, regularMarketChangePercent, regularMarketTime} = data;

    if (!regularMarketTime) {
        await interaction.send(`${symbol} not found`);
        return;
    }

    const lastRefresh = new Date(regularMarketTime * 1000);
    const lastRefreshFormat = format(lastRefresh, "yyyy-MM-dd'T'HH:mm:ssxxx", undefined);
    const diffSymbol = regularMarketChange > 0 ? '🔺' : '🔻';
    const diffColor = regularMarketChange > 0 ? 0x44bd32 : 0xe74c3c;
    
    const image = await fetchChart(returnedSymbol, timeRange).catch(err => {
        console.log(err);
    });
    
    const stockEmbed = new Embed({
        title: `${longName || shortName} (${returnedSymbol})`,
        timestamp: lastRefreshFormat,
        color: diffColor,
    });

    if (quoteType === 'CRYPTOCURRENCY') {
        stockEmbed.setAuthor({
            icon_url: coinImageUrl,
            name: fromCurrency
        });
        stockEmbed.setDescription(`${regularMarketPrice}\n${diffSymbol} ${Math.abs(regularMarketChange)} (${regularMarketChangePercent.toFixed(2)}%)`);
    } else {
        stockEmbed.setDescription(`${regularMarketPrice.toFixed(2)}\n${diffSymbol} ${Math.abs(regularMarketChange.toFixed(2))} (${regularMarketChangePercent.toFixed(2)}%)`);
        stockEmbed.setFooter(`Exchange: ${exchange}`);
    }

    const payload: AllWebhookMessageOptions = {
        embeds: [stockEmbed],
    };

    if (image) {
        const imageAttach = new MessageAttachment(`${returnedSymbol}.png`, image);
        payload.file = imageAttach;

        stockEmbed.setImage({
            url: `attachment://${returnedSymbol}.png`
        });
    }

    const message = await interaction.send(payload);
    console.log(message.embeds);
}

const fetchChart = async (symbol: string, timeRange: string): Promise<Uint8Array> => {
    const badger = Deno.run({
        cmd: ["python", "./helpers/badger.py", symbol, timeRange],
        stdout: 'piped'
    });

    const output = await badger.output();
    const { code } = await badger.status();
    
    if (code !== 0) {
        throw new Error('Candlesticks chart not generated')
    }

    return output;
}
