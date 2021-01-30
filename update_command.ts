import config from './config.ts';
import {FrinkiacCommandSchema as commandRequest} from './commands/schemas/frinkiac.ts';

const url = `https://discord.com/api/v8/applications/${config.discord.appID}/commands`;
// const url = `https://discord.com/api/v8/applications/${config.discord.appID}/guilds/${config.discord.testingGuildID}/commands`;

const headers = {
    "Authorization": `Bot ${config.discord.token}`,
    'Content-Type': 'application/json',
    'Accepts': 'application/json'
}

const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(commandRequest),
    headers,
});

console.dir(await response.json(), {depth: 10})