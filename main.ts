import config from './config.ts';
import { createBot, GatewayIntents, startBot } from 'discordeno/mod.ts';
import { fastFileLoader } from 'discordeno/plugins/fileloader/mod.ts';
import { events } from "./events/mod.ts";

const paths = [
    "./events",
    "./commands",
]

await fastFileLoader(paths);

const client = createBot({
    botId: config.discord.botID,
    token: config.discord.token,
    intents: GatewayIntents.Guilds,
    events
});

await startBot(client);
