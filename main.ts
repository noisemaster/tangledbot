import config from "./config.ts";
import { createBot, GatewayIntents, logger } from "@discordeno/bot";
import { events } from "./events/mod.ts";

import "./events/interactionCreate.ts";
import "./commands/index.ts";
import { commands } from "./commands/mod.ts";
import { client } from "./bot.ts";

logger.info("Starting bot...");
await client.start();
logger.info("Bot started!");

await client.helpers.upsertGlobalApplicationCommands(commands.array());
