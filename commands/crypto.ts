import { Embed, InteractionResponseType, MessageComponentInteraction, SlashCommandInteraction, MessageComponentType, ButtonStyle } from 'https://deno.land/x/harmony@v2.0.0-rc2/mod.ts'
// import { format } from "https://deno.land/x/date_fns@v2.15.0/index.js";
// import { MessageAttachment } from "https://deno.land/x/harmony@v2.0.0-rc2/mod.ts";
import { Pageable, paginationPost, setPageablePost, generatePageButtons } from "../handlers/paginationHandler.ts";
import { v4 } from "https://deno.land/std@0.97.0/uuid/mod.ts";
import querystring from "https://deno.land/std@0.97.0/node/querystring.ts";
import config from "../config.ts"

interface cmcCoin extends Pageable {
    id: number;
    name: string;
    symbol: string;
    slug: string;
    is_active: number;
    status: string;
    rank: number;
}

// Should be cached in redis at some point
let cryptoMap: cmcCoin[] = [];

export const sendCryptoEmbed = async (interaction: SlashCommandInteraction) => {
    const symbolOption = interaction.data.options.find(option => option.name === 'symbol');
    const symbol: string = symbolOption ? symbolOption.value : '';

    // const timeRangeOption = interaction.data.options.find(option => option.name === 'timerange');
    // const timeRange: string = timeRangeOption ? timeRangeOption.value : '1d';

    await interaction.respond({
        type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE,
    });

    if (cryptoMap.length === 0) {
        await fetchCryptoMap();
    }

    const coinsMatchingSymbol = cryptoMap.filter(coin => coin.symbol.toLowerCase().startsWith(symbol.toLowerCase()));

    if (coinsMatchingSymbol.length === 0) {
        await interaction.send('No coin found', {});
        return;
    }

    const [firstCoin] = coinsMatchingSymbol;
    const internalMessageId = v4.generate();
    const embed = await generateCryptoQuoteEmbed(firstCoin);

    const postData: paginationPost<cmcCoin> = {
        pages: coinsMatchingSymbol,
        poster: interaction.user.id,
        embedMessage: embed,
        currentPage: 1,
        paginationHandler: cryptoPageHandler
    }

    await interaction.send({
        allowedMentions: {
            users: []
        },
        embed,
        components: coinsMatchingSymbol.length > 1 ? generatePageButtons('crypto', postData, internalMessageId): [],
    });

    setPageablePost(internalMessageId, postData);
}

const fetchCryptoMap = async () => {
    const url = 'https://api.coinmarketcap.com/data-api/v3/map/all?cryptoAux=is_active,status&exchangeAux=is_active,status&listing_status=active,untracked';

    const request = await fetch(url);
    const json = await request.json();

    const {data: {cryptoCurrencyMap}} = json;

    cryptoMap = cryptoCurrencyMap;
}

const cryptoPageHandler = async (interaction: MessageComponentInteraction, postData: paginationPost<cmcCoin>) => {
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
    const newEmbed = await generateCryptoQuoteEmbed(page);
    const newComponents = generatePageButtons('crypto', postData, messageId);

    if (interaction.message) {
        await interaction.editMessage(
            interaction.message, {
                embeds: [newEmbed],
                allowed_mentions: {
                    users: []
                },
                components: newComponents
            }
        );
    }
    setPageablePost(messageId, postData);
}

const generateCryptoQuoteEmbed = async (coin: cmcCoin) => {
    const embed = new Embed({
        author: {
            icon_url: `https://s2.coinmarketcap.com/static/img/coins/128x128/${coin.id}.png`,
            name: `${coin.name} (${coin.symbol})`,
            url: `https://coinmarketcap.com/currencies/${coin.slug}`
        },
    });

    // const currencyInfo = await fetch('https://pro-api.coinmarketcap.com/v1/cryptocurrency/info', {
    //     headers: {
    //         'X-CMC_PRO_API_KEY': config.cmc.apiKey
    //     }
    // });

    const query = querystring.stringify({
        id: coin.id,
        aux: 'num_market_pairs,cmc_rank,date_added,tags,platform,max_supply,circulating_supply,total_supply,market_cap_by_total_supply,volume_24h_reported,volume_7d,volume_7d_reported,volume_30d,volume_30d_reported,is_active,is_fiat'
    });

    const currencyQuote = await fetch(`https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?${query}`, {
        headers: {
            'X-CMC_PRO_API_KEY': config.cmc.apiKey
        }
    });

    const {data} = await currencyQuote.json();
    const coinQuoteData = data[`${coin.id}`];

    const { price, percent_change_1h: hourChangePercent, percent_change_24h: dayChangePercent, percent_change_7d: weekChangePercent, market_cap: marketCap } = coinQuoteData.quote.USD;
    const dayDiffColor = dayChangePercent > 0 ? 0x44bd32 : 0xe74c3c;

    const hourChange = Math.abs(price * (hourChangePercent / 100));
    const hourDiffSymbol = hourChangePercent > 0 ? '<:small_green_triangle:851144859103395861>' : '🔻';

    const dayChange = Math.abs(price * (dayChangePercent / 100));
    const dayDiffSymbol = dayChangePercent > 0 ? '<:small_green_triangle:851144859103395861>' : '🔻';

    const weekChange = Math.abs(price * (weekChangePercent / 100));
    const weekDiffSymbol = weekChangePercent > 0 ? '<:small_green_triangle:851144859103395861>' : '🔻';

    embed.setColor(dayDiffColor);
    embed.setFields([
        {
            name: 'Current Price',
            value: `${price > 5 ? price.toFixed(2) : price.toFixed(5)}`,
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
    embed.setTimestamp(coinQuoteData.last_updated);
    embed.setFooter(`CMC Rank: ${coinQuoteData.cmc_rank}`);

    return embed;
}