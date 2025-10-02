import config from '../config.ts';
import {NFLCommandSchema as commandRequest} from '../schemas/nfl.ts';

const [mode = 'prod'] = Deno.args;
let url = '';

if (mode === 'prod') {
    url = `https://discord.com/api/v8/applications/${config.discord.appID}/commands`;
} else if (mode === 'test') {
    url = `https://discord.com/api/v8/applications/${config.discord.appID}/guilds/${config.discord.testingGuildID}/commands`;
}

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