import { Embed, InteractionResponseType, MessageComponentInteraction, SlashCommandInteraction, MessageComponentType, ButtonStyle, MessageAttachment } from 'https://deno.land/x/harmony@v2.0.0-rc2/mod.ts'
// import { format } from "https://deno.land/x/date_fns@v2.15.0/index.js";
// import { MessageAttachment } from "https://deno.land/x/harmony@v2.0.0-rc2/mod.ts";
import { Pageable, paginationPost, setPageablePost, generatePageButtons } from "../handlers/paginationHandler.ts";
import { v4 } from "https://deno.land/std@0.97.0/uuid/mod.ts";
import { AllWebhookMessageOptions } from "https://deno.land/x/harmony@v2.0.0-rc2/src/structures/webhook.ts";

interface cgCoin extends Pageable {
    id: string;
    symbol: string;
    name: string;
    platforms: {
        [networkId: string]: string
    };
}

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

    const coinsMatchingSymbol = cryptoMap.filter(coin => coin.symbol.toLowerCase().startsWith(symbol));

    if (coinsMatchingSymbol.length === 0) {
        await interaction.send('No coin found', {});
        return;
    }

    coinsMatchingSymbol.sort((x, y) => {
        if (x.symbol === symbol || y.symbol === symbol) {
            return y.symbol === x.symbol ? 1 : -1;
        }
        return -1;
    });
    const [firstCoin] = coinsMatchingSymbol;
    const internalMessageId = v4.generate();
    const embed = await generateCryptoQuoteEmbed(firstCoin, timeRange);

    const postData: paginationPost<cgCoin> = {
        pages: coinsMatchingSymbol,
        poster: interaction.user.id,
        embedMessage: embed.embeds![0],
        currentPage: 1,
        paginationHandler: cryptoPageHandler,
        interactionData: {
            timeRange,
        }
    }

    await interaction.send({
        allowedMentions: {
            users: []
        },
        ...embed,
        components: coinsMatchingSymbol.length > 1 ? generatePageButtons('crypto', postData, internalMessageId): [],
    });

    setPageablePost(internalMessageId, postData);
}

const fetchCryptoMap = async () => {
    const url = 'https://api.coingecko.com/api/v3/coins/list?include_platform=true';

    const request = await fetch(url);
    const coinMap = await request.json();

    cryptoMap = coinMap;
}

const cryptoPageHandler = async (interaction: MessageComponentInteraction, postData: paginationPost<cgCoin>) => {
    const {custom_id: customId} = interaction.data;
    const [_componentId, _commandInvoker, action, messageId] = customId.split('_');

    console.log(customId);
    
    if (action === 'prev' && postData.currentPage === 1) {
        postData.currentPage = postData.pages.length;
    } else if (action === 'prev') {
        postData.currentPage -= 1;        
    } else if (action === 'next' && postData.currentPage === postData.pages.length) {
        postData.currentPage = 1;
    } else if (action === 'next') {
        postData.currentPage += 1;
    }        
    
    const page = postData.pages[postData.currentPage - 1];
    const newEmbed = await generateCryptoQuoteEmbed(page, postData.interactionData.timeRange);
    const newComponents = generatePageButtons('crypto', postData, messageId);

    if (interaction.message) {
        await interaction.editMessage(
            interaction.message, {
                ...newEmbed,
                allowed_mentions: {
                    users: []
                },
                components: newComponents
            }
        );
    }
    setPageablePost(messageId, postData);
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

    console.log(coinData);

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

    const payload: AllWebhookMessageOptions = {
        embeds: [embed],
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
