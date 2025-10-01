import { logger } from "@discordeno/bot";

import "./events/interactionCreate.ts";
import "./commands/index.ts";
import { commands } from "./commands/mod.ts";
import { client } from "./bot.ts";
import { startBot } from "discordeno";

logger.info("Starting bot...");
await startBot(client);
logger.info("Bot started!");

await client.helpers.upsertGlobalApplicationCommands(commands.array());
