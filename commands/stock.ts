import {
    generateTimerangeButtons,
    HasTimerange,
    setTimerangePost,
    timerangePost,
} from "../handlers/timerangeHandler.ts";
import { v4 } from "uuid";

import { createCommand } from "./mod.ts";
import {
    ApplicationCommandOptionTypes,
    ApplicationCommandTypes,
    Bot,
    Camelize,
    DiscordEmbed,
    Embed,
    FileContent,
    Interaction,
    InteractionCallbackData,
    InteractionResponseTypes,
} from "@discordeno/bot";
import { updateInteractionWithFile } from "./lib/updateInteraction.ts";

interface YahooStockQuote extends HasTimerange {
    symbol?: string;
    exchange?: string;
    quoteType?: string;
    coinImageUrl?: string;
    fromCurrency?: string;
    longName?: string;
    shortName?: string;
    regularMarketPrice?: number;
    regularMarketChange?: number;
    regularMarketChangePercent?: number;
    regularMarketTime?: number;
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
];

const fetchQuote = async (bot: Bot, interaction: Interaction) => {
    if (!interaction.data) {
        return;
    }

    const symbolOption = interaction.data!.options!.find((option) =>
        option.name === "symbol"
    );
    const symbol: string = symbolOption ? symbolOption.value as string : "";

    const timeRangeOption = interaction.data!.options!.find((option) =>
        option.name === "timerange"
    );
    const timeRange: string = timeRangeOption
        ? timeRangeOption.value as string
        : "1d";

    await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
        type: InteractionResponseTypes.DeferredChannelMessageWithSource,
    });

    // const url =
        // `https://query1.finance.yahoo.com/v6/finance/quote?symbols=${symbol}`;

    // let stockResp = await fetch(url);
    // let stock = await stockResp.json();
    // let { result } = stock.quoteResponse;

    let text = await fetch('https://finance.yahoo.com/quote/U', {headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/116.0'}}).then(resp => resp.text())
    const titlePos = text.indexOf('<title>')
    const titlePosEnd = text.indexOf('</title>')
    const stockName = text.substr(titlePos + 7, titlePosEnd-titlePos-7-55)
    

    // if (
    //     result.length === 0 ||
    //     (result[0].quoteType === "MUTUALFUND" && !result[0].marketCap)
    // ) {
    //     stockResp = await fetch(url + "-USD");
    //     stock = await stockResp.json();
    //     result = stock.quoteResponse.result;

    //     if (result.length === 0) {
    //         await bot.helpers.sendFollowupMessage(interaction.token, {
    //             type: InteractionResponseTypes.ChannelMessageWithSource,
    //             data: {
    //                 content: `${symbol} not found`,
    //             },
    //         });
    //         return;
    //     }
    // }

    // const [data]: [YahooStockQuote] = result;

    // if (!data.regularMarketTime) {
    //     await bot.helpers.sendFollowupMessage(interaction.token, {
    //         type: InteractionResponseTypes.ChannelMessageWithSource,
    //         data: {
    //             content: `${symbol} not found`,
    //         },
    //     });
    //     return;
    // }

    const data = {
        symbol: symbol,
        longName: stockName,
    }

    const payload = await generateStockEmbed(data as any, timeRange);

    const timerangeData: timerangePost<YahooStockQuote> = {
        data: data as any,
        currentTime: timeRange,
        embedMessage: payload.embeds![0],
        interactionData: {
            timeRange,
        },
        poster: interaction.user.id,
        timeRanges: YahooTimeranges,
        timeRangeHandler: stockTimerangeHandler,
    };

    const internalMessageId = v4();
    const timerangeComponents = generateTimerangeButtons(
        "stock",
        timerangeData,
        internalMessageId,
    );

    await updateInteractionWithFile(bot, interaction.token, {
        ...payload,
        components: [
            ...timerangeComponents,
        ],
    });

    setTimerangePost(internalMessageId, timerangeData);
};

const generateStockEmbed = async (
    quoteData: YahooStockQuote,
    timerange: string,
) => {
    const {
        symbol,
        exchange,
        quoteType,
        coinImageUrl,
        fromCurrency,
        longName,
        shortName,
        regularMarketPrice = 0,
        regularMarketChange = 0,
        regularMarketChangePercent = 0,
        regularMarketTime,
    } = quoteData;

    const lastRefresh = regularMarketTime ? new Date(regularMarketTime * 1000) : new Date();
    const diffSymbol = regularMarketChange > 0
        ? "<:small_green_triangle:851144859103395861>"
        : "🔻";
    const diffColor = regularMarketChange > 0 ? 0x44bd32 : 0xe74c3c;

    const image = await fetchChart(symbol!, timerange).catch((err) => {
        console.log(err);
    });

    const stockEmbed: Camelize<DiscordEmbed> = {
        title: `${longName || shortName}`,
        timestamp: String(lastRefresh.valueOf()),
        color: diffColor,
    };

    // if (quoteType === "CRYPTOCURRENCY") {
    //     stockEmbed.author = {
    //         iconUrl: coinImageUrl,
    //         name: fromCurrency,
    //     };
    //     stockEmbed.description = `${regularMarketPrice}\n${diffSymbol} ${Math.abs(regularMarketChange)
    //         } (${regularMarketChangePercent.toFixed(2)}%)`;
    // } else {
    //     stockEmbed.description = `${regularMarketPrice.toFixed(2)}\n${diffSymbol} ${Math.abs(regularMarketChange).toFixed(2)
    //         } (${regularMarketChangePercent.toFixed(2)}%)`;
    //     stockEmbed.footer = {
    //         text: `Exchange: ${exchange}`,
    //     };
    // }

    const payload: InteractionCallbackData = {
    };

    if (image) {
        const imageAttach: FileContent = {
            name: `${symbol}.png`,
            blob: new Blob([image])
        };
        payload.files = [imageAttach];

        stockEmbed.image = {
            url: `attachment://${symbol}.png`,
        };
    }

    payload.embeds = [stockEmbed];

    return payload;
};

const stockTimerangeHandler = async (
    bot: Bot,
    interaction: Interaction,
    pageData: timerangePost<YahooStockQuote>,
) => {
    const { customId } = interaction.data!;
    const [_componentId, _commandInvoker, _action, messageId] = customId!.split(
        "_",
    );

    console.log(customId);

    const [timerange] = (interaction.data as any).values;
    pageData.currentTime = timerange;

    const newEmbed = await generateStockEmbed(
        pageData.data,
        pageData.currentTime,
    );
    const timerangeComponents = generateTimerangeButtons(
        "stock",
        pageData,
        messageId,
    );

    if (interaction.message) {
        await updateInteractionWithFile(
            bot,
            interaction.token,
            {
                ...newEmbed,
                components: [
                    ...timerangeComponents,
                ],
            },
        );
    }

    setTimerangePost(messageId, pageData);
};

const fetchChart = async (
    symbol: string,
    timeRange: string,
): Promise<ArrayBuffer> => {
    const badger = Bun.spawn({
        cmd: ["python3", "./helpers/badger.py", symbol, timeRange],
        stdout: "pipe",
    });

    const output = badger.stdout;
    const code = badger.exitCode;

    if (code !== 0) {
        throw new Error("Candlesticks chart not generated");
    }

    return new Response(output).arrayBuffer();
};

createCommand({
    name: "stock",
    description: "Get stock information",
    execute: fetchQuote,
    type: ApplicationCommandTypes.ChatInput,
    options: [
        {
            name: "symbol",
            description: "Stock Symbol",
            required: true,
            type: ApplicationCommandOptionTypes.String,
        },
        {
            name: "timerange",
            description: "Chart time range",
            type: ApplicationCommandOptionTypes.String,
            required: true,
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
                { name: "Max", value: "max" },
            ],
        },
    ],
});
