import { Embed, InteractionResponseType, MessageComponentInteraction, SlashCommandInteraction } from 'https://deno.land/x/harmony@v2.1.3/mod.ts'
import { format } from "https://deno.land/x/date_fns@v2.15.0/index.js";
import { MessageAttachment } from "https://deno.land/x/harmony@v2.1.3/mod.ts";
import { webhookOptionsWithAttachments } from '../interfaces/webhookOptionsWithAttachments.ts';
import { generateTimerangeButtons, HasTimerange, setTimerangePost, timerangePost } from "../handlers/timerangeHandler.ts";
import { v4 } from "https://deno.land/std@0.97.0/uuid/mod.ts";

interface YahooStockQuote extends HasTimerange {
    symbol: string,
    exchange: string,
    quoteType: string,
    coinImageUrl: string,
    fromCurrency: string,
    longName: string,
    shortName: string,
    regularMarketPrice: number,
    regularMarketChange: number,
    regularMarketChangePercent: number,
    regularMarketTime: number
}

const YahooTimeranges = [
    { name: "1 Day", value: "1d" },
    { name: "5 Days", value: "5d" },
    { name: "1 Month", value: "1mo" },
    { name: "3 Months", value: "3mo" },
    { name: "6 Months", value: "6mo" },
    { name: "1 Year", value: "1y" },
    { name: "2 Years", value: "2y" },
    { name: "5 Years", value: "5y" },
    { name: "Year to Date", value: "ytd" },
    { name: "Max", value: "max" },
]

export const fetchQuote = async (interaction: SlashCommandInteraction) => {
    if (!interaction.data) {
        return;
    }

    const symbolOption = interaction.data.options.find(option => option.name === 'symbol');
    const symbol: string = symbolOption ? symbolOption.value : '';

    const timeRangeOption = interaction.data.options.find(option => option.name === 'timerange');
    const timeRange: string = timeRangeOption ? timeRangeOption.value : '1d';

    await interaction.respond({
        type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE,
    });

    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`

    let stockResp = await fetch(url);
    let stock = await stockResp.json();
    let {result} = stock.quoteResponse;

    if (result.length === 0 || (result[0].quoteType === 'MUTUALFUND' && !result[0].marketCap)) {
        stockResp = await fetch(url + '-USD');
        stock = await stockResp.json();
        result = stock.quoteResponse.result;

        if (result.length === 0) {
            await interaction.send(`${symbol} not found`, {});
            return;
        }
    }

    const [data]: [YahooStockQuote] = result;

    if (!data.regularMarketTime) {
        await interaction.send(`${symbol} not found`, {});
        return;
    }

    const payload = await generateStockEmbed(data, timeRange)

    const timerangeData: timerangePost<YahooStockQuote> = {
        data,
        currentTime: timeRange,
        embedMessage: payload.embeds![0],
        interactionData: {
            timeRange,
        },
        poster: interaction.user.id,
        timeRanges: YahooTimeranges,
        timeRangeHandler: stockTimerangeHandler
    };

    const internalMessageId = v4.generate();
    const timerangeComponents = generateTimerangeButtons('stock', timerangeData, internalMessageId)

    await interaction.send({
        ...payload,
        components: [
            ...timerangeComponents
        ]
    });

    setTimerangePost(internalMessageId, timerangeData);
}

const generateStockEmbed = async (quoteData: YahooStockQuote, timerange: string) => {
    const {symbol, exchange, quoteType, coinImageUrl, fromCurrency, longName, shortName, regularMarketPrice, regularMarketChange, regularMarketChangePercent, regularMarketTime} = quoteData;

    const lastRefresh = new Date(regularMarketTime * 1000);
    const lastRefreshFormat = format(lastRefresh, "yyyy-MM-dd'T'HH:mm:ssxxx", undefined);
    const diffSymbol = regularMarketChange > 0 ? '<:small_green_triangle:851144859103395861>' : '🔻';
    const diffColor = regularMarketChange > 0 ? 0x44bd32 : 0xe74c3c;
    
    const image = await fetchChart(symbol, timerange).catch(err => {
        console.log(err);
    });
    
    const stockEmbed = new Embed({
        title: `${longName || shortName} (${symbol})`,
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
        stockEmbed.setDescription(`${regularMarketPrice.toFixed(2)}\n${diffSymbol} ${Math.abs(regularMarketChange).toFixed(2)} (${regularMarketChangePercent.toFixed(2)}%)`);
        stockEmbed.setFooter(`Exchange: ${exchange}`);
    }

    const payload: webhookOptionsWithAttachments = {
        embeds: [stockEmbed],
        attachments: [],
    }

    if (image) {
        const imageAttach = new MessageAttachment(`${symbol}.png`, image);
        payload.file = imageAttach;

        stockEmbed.setImage({
            url: `attachment://${symbol}.png`
        });
    }

    return payload;
}

const stockTimerangeHandler = async (interaction: MessageComponentInteraction, pageData: timerangePost<YahooStockQuote>) => {
    const {custom_id: customId} = interaction.data;
    const [_componentId, _commandInvoker, _action, messageId] = customId.split('_');

    console.log(customId);

    const [timerange] = (interaction.data as any).values;
    pageData.currentTime = timerange;

    const newEmbed = await generateStockEmbed(pageData.data, pageData.currentTime);
    const timerangeComponents = generateTimerangeButtons('stock', pageData, messageId);

    if (interaction.message) {
        await interaction.editMessage(
            interaction.message, {
                ...newEmbed,
                allowed_mentions: {
                    users: []
                },
                components: [
                    ...timerangeComponents
                ],
            }
        );
    }

    setTimerangePost(messageId, pageData);
}

const fetchChart = async (symbol: string, timeRange: string): Promise<Uint8Array> => {
    const badger = Deno.run({
        cmd: ["python3", "./helpers/badger.py", symbol, timeRange],
        stdout: 'piped'
    });

    const output = await badger.output();
    const { code } = await badger.status();
    
    if (code !== 0) {
        throw new Error('Candlesticks chart not generated')
    }

    return output;
}
