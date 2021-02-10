import { Interaction } from "https://deno.land/x/harmony@v1.0.0/src/structures/slash.ts";
import { InteractionResponseType } from "https://deno.land/x/harmony@v1.0.0/src/types/slash.ts";
import { format } from "https://deno.land/x/date_fns@v2.15.0/index.js";
import { Embed } from "https://deno.land/x/harmony@v1.0.0/src/structures/embed.ts";
import puppeteer from "https://deno.land/x/puppeteer@5.5.1/mod.ts";
import { MessageAttachment } from "https://deno.land/x/harmony@v1.0.0/mod.ts";

export const fetchQuote = async (interaction: Interaction) => {
    const symbolOption = interaction.data.options.find(option => option.name === 'symbol');
    const symbol: string = symbolOption ? symbolOption.value : '';

    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`

    let stockResp = await fetch(url);
    let stock = await stockResp.json();
    let {result} = stock.quoteResponse;

    await interaction.respond({
        type: InteractionResponseType.ACK_WITH_SOURCE,
    });

    if (result.length === 0 || result[0].quoteType === 'MUTUALFUND') {
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
    
    const image = await fetchChart(returnedSymbol);
    const stockEmbed = new Embed({
        title: `${longName || shortName} (${returnedSymbol})`,
        timestamp: lastRefreshFormat,
        color: diffColor,
        image: {
            url: `attachment://${returnedSymbol}.png`
        }
    });

    const imageAttach = new MessageAttachment(`${returnedSymbol}.png`, image);

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

    await interaction.send({
        embeds: [stockEmbed],
        file: imageAttach,
    });
}

// this is probably the worst way to do this, but uhh it'll shut kaz up
const fetchChart = async (symbol: string): Promise<Uint8Array> => {
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();
    await page.goto(`https://finance.yahoo.com/chart/${symbol}`);
    await page.waitForNavigation({waitUntil: 'networkidle2'});
    const screenshot = await page.screenshot({encoding: 'binary'});
    await browser.close();
    return screenshot as Uint8Array;
}
