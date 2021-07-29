import { Embed, InteractionResponseType, MessageComponentInteraction, SlashCommandInteraction, MessageAttachment, MessageComponentOption } from 'https://deno.land/x/harmony@v2.0.0-rc2/mod.ts'
// import { format } from "https://deno.land/x/date_fns@v2.15.0/index.js";
// import { MessageAttachment } from "https://deno.land/x/harmony@v2.0.0-rc2/mod.ts";
import { Pageable, paginationPost, setPageablePost, generatePageButtons, getPageablePost } from "../handlers/paginationHandler.ts";
import { v4 } from "https://deno.land/std@0.97.0/uuid/mod.ts";
import { WebhookMessageOptions } from "https://deno.land/x/harmony@v2.0.0-rc2/src/structures/webhook.ts";
import { generateTimerangeButtons, getTimerangePost, HasTimerange, setTimerangePost, timerangePost } from "../handlers/timerangeHandler.ts";

interface cgCoin extends Pageable, HasTimerange {
    id: string;
    symbol: string;
    name: string;
    platforms: {
        [networkId: string]: string
    };
}

interface webhookOptionsWithAttachments extends WebhookMessageOptions {
    attachments: MessageAttachment[]
}

const coinGeckoTimeRanges = [
    { name: "1 Day", value: "1" },
    { name: "7 Days", value: "7" },
    { name: "2 Weeks", value: "14" },
    { name: "1 Month", value: "30" },
    { name: "3 Months", value: "90" },
    { name: "6 Months", value: "180" },
    { name: "1 Year", value: "365" },
    { name: "Max", value: "max" },
]

// Should be cached in redis at some point
let cryptoMap: cgCoin[] = [];

export const sendCryptoEmbed = async (interaction: SlashCommandInteraction) => {
    const symbolOption = interaction.data.options.find(option => option.name === 'symbol');
    const symbol: string = symbolOption ? symbolOption.value.toLowerCase() : '';

    const timeRangeOption = interaction.data.options.find(option => option.name === 'timerange');
    const timeRange: string = timeRangeOption ? timeRangeOption.value : '1';

    await interaction.respond({
        type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE,
    });

    if (cryptoMap.length === 0) {
        await fetchCryptoMap();
    }

    let coinsMatchingSymbol = cryptoMap.filter(coin => coin.symbol.toLowerCase().startsWith(symbol));

    if (coinsMatchingSymbol.length === 0) {
        await interaction.send('No coin found', {});
        return;
    }

    coinsMatchingSymbol = [
        ...coinsMatchingSymbol.filter(coin => coin.symbol === symbol),
        ...coinsMatchingSymbol.filter(coin => coin.symbol !== symbol).sort((x, y) => x.symbol.localeCompare(y.symbol))
    ]

    const [firstCoin] = coinsMatchingSymbol;
    const internalMessageId = v4.generate();
    const embed = await generateCryptoQuoteEmbed(firstCoin, timeRange);

    const pageData: paginationPost<cgCoin> = {
        pages: coinsMatchingSymbol,
        poster: interaction.user.id,
        embedMessage: embed.embeds![0],
        currentPage: 1,
        paginationHandler: cryptoPageHandler,
        pageGenerator: cryptoPageSelectGenerator,
        interactionData: {
            timeRange,
        }
    }

    const timerangeData: timerangePost<cgCoin> = {
        poster: interaction.user.id,
        embedMessage: embed.embeds![0],
        timeRangeHandler: cryptoTimerangeHandler,
        currentTime: timeRange,
        timeRanges: coinGeckoTimeRanges,
        interactionData: {
            timeRange,
        }
    }

    console.log(generatePageButtons('crypto', pageData, internalMessageId)[0].components[1]);

    const components = [
        ...(coinsMatchingSymbol.length > 1 ? generatePageButtons('crypto', pageData, internalMessageId): []),
        ...(generateTimerangeButtons('crypto', timerangeData, internalMessageId))
    ]

    await interaction.send({
        allowedMentions: {
            users: []
        },
        ...embed,
        components
    });

    setPageablePost(internalMessageId, pageData);
    setTimerangePost(internalMessageId, timerangeData)
}

const fetchCryptoMap = async () => {
    const url = 'https://api.coingecko.com/api/v3/coins/list?include_platform=true';

    const request = await fetch(url);
    const coinMap = await request.json();

    cryptoMap = coinMap;
}

const cryptoPageHandler = async (interaction: MessageComponentInteraction, pageData: paginationPost<cgCoin>) => {
    const {custom_id: customId} = interaction.data;
    const [_componentId, _commandInvoker, action, messageId] = customId.split('_');

    console.log(customId);
    
    if (action === 'prev' && pageData.currentPage === 1) {
        pageData.currentPage = pageData.pages.length;
    } else if (action === 'prev') {
        pageData.currentPage -= 1;        
    } else if (action === 'next' && pageData.currentPage === pageData.pages.length) {
        pageData.currentPage = 1;
    } else if (action === 'next') {
        pageData.currentPage += 1;
    } else if (action === 'select') {
        const [page] = (interaction.data as any).values;
        pageData.currentPage = parseInt(page);
    }
    
    const page = pageData.pages[pageData.currentPage - 1];
    const timerangeData = getTimerangePost<cgCoin>(messageId);
    const newEmbed = await generateCryptoQuoteEmbed(page, timerangeData.currentTime);
    const newComponents = [
        ...generatePageButtons('crypto', pageData, messageId),
        ...generateTimerangeButtons('crypto', timerangeData, messageId),
    ]

    if (interaction.message) {
        await interaction.editMessage(
            interaction.message, {
                ...newEmbed,
                allowed_mentions: {
                    users: []
                },
                components: newComponents,
            }
        );
    }

    setPageablePost(messageId, pageData);
    setTimerangePost(messageId, timerangeData);
}

const cryptoTimerangeHandler = async (interaction: MessageComponentInteraction, pageData: timerangePost<cgCoin>) => {
    const {custom_id: customId} = interaction.data;
    const [_componentId, _commandInvoker, action, messageId] = customId.split('_');

    console.log(customId);

    const [timerange] = (interaction.data as any).values;
    pageData.currentTime = timerange;

    const cryptoPages = getPageablePost<cgCoin>(messageId);
    const newEmbed = await generateCryptoQuoteEmbed(cryptoPages.pages[cryptoPages.currentPage - 1], pageData.currentTime);
    const pageComponents = cryptoPages.pages.length > 1 ? generatePageButtons('crypto', cryptoPages, messageId) : [];
    const timerangeComponents = generateTimerangeButtons('crypto', pageData, messageId);

    if (interaction.message) {
        await interaction.editMessage(
            interaction.message, {
                ...newEmbed,
                allowed_mentions: {
                    users: []
                },
                components: [
                    ...pageComponents,
                    ...timerangeComponents
                ],
            }
        );
    }

    setPageablePost(messageId, cryptoPages);
    setTimerangePost(messageId, pageData);
}

const generateCryptoQuoteEmbed = async (coin: cgCoin, timeRange: string) => {
    const quoteRequest = await fetch(`https://api.coingecko.com/api/v3/coins/${coin.id}?localization=false`);
    const coinQuoteData = await quoteRequest.json();

    const { market_data: marketData, ...coinData } = coinQuoteData;
    const price = marketData.current_price.usd;
    const hourChangePercent = marketData.price_change_percentage_1h_in_currency.usd || 0;
    const dayChangePercent = marketData.price_change_percentage_24h_in_currency.usd || 0;
    const weekChangePercent = marketData.price_change_percentage_7d_in_currency.usd || 0;
    const marketCap = marketData.market_cap.usd;

    const dayDiffColor = dayChangePercent > 0 ? 0x44bd32 : 0xe74c3c;

    const hourChange = Math.abs(price * (hourChangePercent / 100));
    const hourDiffSymbol = hourChangePercent > 0 ? '<:small_green_triangle:851144859103395861>' : '🔻';

    const dayChange = Math.abs(price * (dayChangePercent / 100));
    const dayDiffSymbol = dayChangePercent > 0 ? '<:small_green_triangle:851144859103395861>' : '🔻';

    const weekChange = Math.abs(price * (weekChangePercent / 100));
    const weekDiffSymbol = weekChangePercent > 0 ? '<:small_green_triangle:851144859103395861>' : '🔻';

    const embed = new Embed({
        author: {
            icon_url: coinData.image.large,
            name: `${coin.name} (${coin.symbol.toUpperCase()})`,
            url: `https://www.coingecko.com/en/coins/${coin.id}`
        },
        color: dayDiffColor,
    });

    embed.setFields([
        {
            name: 'Current Price',
            value: `${price}`,
            inline: false,
        },
        {
            name: 'Price Change [1h]',
            value: `${hourDiffSymbol} ${hourChange.toFixed(5)} (${hourChangePercent.toFixed(2)}%)`,
            inline: true,
        },
        {
            name: 'Price Change [24h]',
            value: `${dayDiffSymbol} ${dayChange.toFixed(5)} (${dayChangePercent.toFixed(2)}%)`,
            inline: true,
        },
        {
            name: 'Price Change [7d]',
            value: `${weekDiffSymbol} ${weekChange.toFixed(5)} (${weekChangePercent.toFixed(2)}%)`,
            inline: true,
        },
        {
            name: 'Market Cap',
            value: `$${marketCap.toLocaleString()}`,
            inline: false
        }
    ]);
    embed.setTimestamp(marketData.last_updated);
    embed.setFooter(`CoinGecko Rank: ${coinQuoteData.coingecko_rank}`);

    const image = await fetchChart(coin.id, timeRange).catch(err => {
        console.log(err);
    });

    const payload: webhookOptionsWithAttachments = {
        embeds: [embed],
        attachments: []
    };

    if (image) {
        const imageAttach = new MessageAttachment(`${coin.id}.png`, image);
        payload.file = imageAttach;

        embed.setImage({
            url: `attachment://${coin.id}.png`
        });
    }

    return payload;
}

const fetchChart = async (symbol: string, timeRange: string): Promise<Uint8Array> => {
    const hololynx = Deno.run({
        cmd: ["python3", "./helpers/hololynx.py", symbol, timeRange],
        stdout: 'piped'
    });

    const output = await hololynx.output();
    const { code } = await hololynx.status();
    
    if (code !== 0) {
        throw new Error('Candlesticks chart not generated')
    }

    return output;
}

const cryptoPageSelectGenerator = (pages: cgCoin[]): MessageComponentOption[] => {
    return pages.slice(0, 25).map((page, index) => ({
        label: page.symbol.toUpperCase(),
        description: page.name,
        value: `${index + 1}`
    }));
}
