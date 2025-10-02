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
  Camelize,
  DiscordEmbed,
  FileContent,
  InteractionCallbackData,
  InteractionResponseTypes,
  Bot,
  Interaction,
} from "discordeno";

import {
  updateInteraction,
  updateInteractionWithFile,
} from "./lib/updateInteraction.ts";
import vegaLite from "vega-lite";
import { generateVega } from "../helpers/charting.ts";

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

type YahooRanges =
  | "1d"
  | "5d"
  | "1mo"
  | "3mo"
  | "6mo"
  | "1y"
  | "2y"
  | "5y"
  | "10y"
  | "ytd"
  | "max";
type YahooInterval =
  | "1m"
  | "2m"
  | "5m"
  | "15m"
  | "30m"
  | "60m"
  | "90m"
  | "1h"
  | "1d"
  | "5d"
  | "1wk"
  | "1mo"
  | "3mo";

const intervalDataPointMap: { [key in YahooRanges]: YahooInterval } = {
  "1d": "2m",
  "5d": "5m",
  "1mo": "1d",
  "3mo": "1d",
  "6mo": "1wk",
  "1y": "1wk",
  "2y": "1mo",
  "5y": "1mo",
  "10y": "1mo",
  ytd: "1wk",
  max: "3mo",
};

const fetchQuote = async (bot: Bot, interaction: Interaction) => {
  if (!interaction.data) {
    return;
  }

  const symbolOption = interaction.data!.options!.find(
    (option) => option.name === "symbol",
  );
  const symbol: string = symbolOption ? (symbolOption.value as string) : "";

  const timeRangeOption = interaction.data!.options!.find(
    (option) => option.name === "timerange",
  );
  const timeRange: string = timeRangeOption
    ? (timeRangeOption.value as string)
    : "1d";

  await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
    type: InteractionResponseTypes.DeferredChannelMessageWithSource,
  });

  // const url =
  // `https://query1.finance.yahoo.com/v6/finance/quote?symbols=${symbol}`;

  // let stockResp = await fetch(url);
  // let stock = await stockResp.json();
  // let { result } = stock.quoteResponse;

  let text = await fetch(`https://finance.yahoo.com/quote/${symbol}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/116.0",
    },
  }).then((resp) => resp.text());
  const titlePos = text.indexOf("<title>");
  const titlePosEnd = text.indexOf("</title>");
  const stockName = text.substr(titlePos + 7, titlePosEnd - titlePos - 7 - 55);

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
  };

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

  payload.components = timerangeComponents;

  await updateInteraction(interaction, payload, payload.files as FileContent[]);

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

  const lastRefresh = regularMarketTime
    ? new Date(regularMarketTime * 1000)
    : new Date();
  const diffSymbol =
    regularMarketChange > 0
      ? "<:small_green_triangle:851144859103395861>"
      : "🔻";
  const diffColor = regularMarketChange > 0 ? 0x44bd32 : 0xe74c3c;

  const image = await fetchChart(symbol!, timerange).catch((err) => {
    console.log(err);
  });

  const stockEmbed: Camelize<DiscordEmbed> = {
    title: `${longName || shortName}`,
    timestamp: lastRefresh.toISOString(),
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

  const payload: InteractionCallbackData = {};

  if (image) {
    const imageAttach: FileContent = {
      name: `${symbol}.png`,
      blob: image as any,
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
  const [_componentId, _commandInvoker, _action, messageId] =
    customId!.split("_");

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
    await updateInteraction(
      interaction,
      {
        ...newEmbed,
        components: [...timerangeComponents],
      },
      newEmbed.files as FileContent[],
    );
  }

  setTimerangePost(messageId, pageData);
};

const fetchChart = async (symbol: string, timeRange: string): Promise<Blob> => {
  const interval = intervalDataPointMap[timeRange as YahooRanges];
  const data: any = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${timeRange}&interval=${interval}`,
  ).then((res) => res.json());

  const timestamps = data.chart.result[0].timestamp;
  const quoteOpen = data.chart.result[0].indicators.quote[0].open;
  const close = data.chart.result[0].indicators.quote[0].close;
  const volume = data.chart.result[0].indicators.quote[0].volume;
  const high = data.chart.result[0].indicators.quote[0].high;
  const low = data.chart.result[0].indicators.quote[0].low;

  const candleStickSchema = vegaLite.compile({
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    description: "A simple bar chart with embedded data.",
    width: 1280 / 2,
    height: 720 / 2,
    data: {
      values: timestamps.map((timestamp: any, index: number) => {
        return {
          date: new Date(timestamp * 1000),
          open: quoteOpen[index],
          close: close[index],
          high: high[index],
          low: low[index],
          volume: volume[index],
        };
      }),
    },
    encoding: {
      x: {
        field: "date",
        type: "temporal",
        axis: {
          format: "%m/%d %H:%M",
          labelAngle: -45,
        },
      },
      y: {
        type: "quantitative",
        scale: { zero: false },
        axis: { title: "Price" },
      },
      color: {
        condition: {
          test: "datum.open < datum.close",
          value: "#06982d",
        },
        value: "#ae1325",
      },
    },
    layer: [
      {
        mark: "rule",
        encoding: {
          y: { field: "low" },
          y2: { field: "high" },
        },
      },
      {
        mark: "bar",
        encoding: {
          y: { field: "open" },
          y2: { field: "close" },
        },
      },
    ],
  }).spec;

  const buffer = await generateVega(candleStickSchema);

  return new Blob([buffer] as any);
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
