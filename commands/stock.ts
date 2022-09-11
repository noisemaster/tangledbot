import {
    generateTimerangeButtons,
    HasTimerange,
    setTimerangePost,
    timerangePost,
} from "../handlers/timerangeHandler.ts";
import { v4 } from "https://deno.land/std@0.97.0/uuid/mod.ts";

import { createCommand } from "./mod.ts";
import {
    ApplicationCommandOptionTypes,
    ApplicationCommandTypes,
    Bot,
    Embed,
    FileContent,
    Interaction,
    InteractionCallbackData,
    InteractionResponseTypes,
} from "discordeno/mod.ts";

interface YahooStockQuote extends HasTimerange {
    symbol: string;
    exchange: string;
    quoteType: string;
    coinImageUrl: string;
    fromCurrency: string;
    longName: string;
    shortName: string;
    regularMarketPrice: number;
    regularMarketChange: number;
    regularMarketChangePercent: number;
    regularMarketTime: number;
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

    const url =
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`;

    let stockResp = await fetch(url);
    let stock = await stockResp.json();
    let { result } = stock.quoteResponse;

    if (
        result.length === 0 ||
        (result[0].quoteType === "MUTUALFUND" && !result[0].marketCap)
    ) {
        stockResp = await fetch(url + "-USD");
        stock = await stockResp.json();
        result = stock.quoteResponse.result;

        if (result.length === 0) {
            await bot.helpers.sendFollowupMessage(interaction.token, {
                type: InteractionResponseTypes.ChannelMessageWithSource,
                data: {
                    content: `${symbol} not found`,
                },
            });
            return;
        }
    }

    const [data]: [YahooStockQuote] = result;

    if (!data.regularMarketTime) {
        await bot.helpers.sendFollowupMessage(interaction.token, {
            type: InteractionResponseTypes.ChannelMessageWithSource,
            data: {
                content: `${symbol} not found`,
            },
        });
        return;
    }

    const payload = await generateStockEmbed(data, timeRange);

    const timerangeData: timerangePost<YahooStockQuote> = {
        data,
        currentTime: timeRange,
        embedMessage: payload.embeds![0],
        interactionData: {
            timeRange,
        },
        poster: interaction.user.id,
        timeRanges: YahooTimeranges,
        timeRangeHandler: stockTimerangeHandler,
    };

    const internalMessageId = v4.generate();
    const timerangeComponents = generateTimerangeButtons(
        "stock",
        timerangeData,
        internalMessageId,
    );

    await bot.helpers.editOriginalInteractionResponse(interaction.token, {
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
        regularMarketPrice,
        regularMarketChange,
        regularMarketChangePercent,
        regularMarketTime,
    } = quoteData;

    const lastRefresh = new Date(regularMarketTime * 1000);
    const diffSymbol = regularMarketChange > 0
        ? "<:small_green_triangle:851144859103395861>"
        : "🔻";
    const diffColor = regularMarketChange > 0 ? 0x44bd32 : 0xe74c3c;

    const image = await fetchChart(symbol, timerange).catch((err) => {
        console.log(err);
    });

    const stockEmbed: Embed = {
        title: `${longName || shortName} (${symbol})`,
        timestamp: lastRefresh.valueOf(),
        color: diffColor,
    };

    if (quoteType === "CRYPTOCURRENCY") {
        stockEmbed.author = {
            iconUrl: coinImageUrl,
            name: fromCurrency,
        };
        stockEmbed.description = `${regularMarketPrice}\n${diffSymbol} ${Math.abs(regularMarketChange)
            } (${regularMarketChangePercent.toFixed(2)}%)`;
    } else {
        stockEmbed.description = `${regularMarketPrice.toFixed(2)}\n${diffSymbol} ${Math.abs(regularMarketChange).toFixed(2)
            } (${regularMarketChangePercent.toFixed(2)}%)`;
        stockEmbed.footer = {
            text: `Exchange: ${exchange}`,
        };
    }

    const payload: InteractionCallbackData = {
        embeds: [stockEmbed],
    };

    if (image) {
        // const imageAttach = (, image);
        const imageAttach: FileContent = {
            name: `${symbol}.png`,
            blob: new Blob([image]),
        };
        payload.file = imageAttach;

        stockEmbed.image = {
            url: `attachment://${symbol}.png`,
        };
    }

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
        await bot.helpers.editOriginalInteractionResponse(
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
): Promise<Uint8Array> => {
    const badger = Deno.run({
        cmd: ["python3", "./helpers/badger.py", symbol, timeRange],
        stdout: "piped",
    });

    const output = await badger.output();
    const { code } = await badger.status();

    if (code !== 0) {
        throw new Error("Candlesticks chart not generated");
    }

    return output;
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
