import config from './config.ts';
import { createBot, GatewayIntents, logger } from '@discordeno/bot';
import { events } from "./events/mod.ts";

import './events/interactionCreate.ts';
import './commands/index.ts';

const client = createBot({
    // botId: config.discord.botID,
    token: config.discord.token,
    intents: GatewayIntents.Guilds,
    events
});

client.transformers.desiredProperties.interaction = {
    id: true,
    applicationId: true,
    type: true,
    guildId: true,
    channelId: true,
    member: true,
    user: true,
    token: true,
    version: true,
    message: true,
    data: true,
    locale: true,
    guildLocale: true,
    appPermissions: true,
}

logger.info('Starting bot...');
await client.start();
logger.info('Bot started!');