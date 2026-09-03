import { logger } from "@discordeno/utils";

import "./events/interactionCreate.ts";
import { client } from "./bot.ts";
import { loadCommands } from "./commands/index.ts";
import { commands } from "./commands/mod.ts";

const MAX_RETRY_DELAY_MS = 30_000;
const STARTUP_ATTEMPTS = 5;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(
  label: string,
  operation: () => Promise<T>,
  maxAttempts = STARTUP_ATTEMPTS,
): Promise<T> {
  let attempt = 1;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= maxAttempts) {
        throw error;
      }

      const retryDelay = Math.min(
        1_000 * 2 ** (attempt - 1),
        MAX_RETRY_DELAY_MS,
      );
      logger.warn(
        `${label} failed (attempt ${attempt}/${maxAttempts}); retrying in ${retryDelay}ms`,
        error,
      );
      await delay(retryDelay);
      attempt += 1;
    }
  }
}

async function syncApplicationCommands(): Promise<void> {
  await withRetry(
    "Application command sync",
    () => client.helpers.upsertGlobalApplicationCommands(commands.array()),
  );
  logger.info(`Synced ${commands.size} application commands.`);
}

async function main(): Promise<void> {
  const loadResult = await loadCommands();
  logger.info(`Loaded ${loadResult.loaded.length} command modules.`);

  if (loadResult.failed.length > 0) {
    logger.warn(
      `Bot will continue without ${loadResult.failed.length} command modules: ${
        loadResult.failed.join(", ")
      }`,
    );
  }

  if (commands.size === 0) {
    throw new Error("No application commands loaded successfully");
  }

  logger.info("Starting bot...");
  await withRetry("Discord gateway startup", () => client.start());
  logger.info("Bot started!");

  // Command registration is useful but not required to keep the gateway alive.
  // Own this promise so a transient Discord REST failure cannot stop the bot.
  void syncApplicationCommands().catch((error) => {
    logger.error("Application command sync failed after all retries", error);
  });
}

process.on("unhandledRejection", (reason) => {
  // This is a last-resort boundary for third-party callbacks. Application code
  // should still catch failures at the task/event that owns the promise.
  logger.error("Unhandled promise rejection escaped its owner", reason);
});

process.on("uncaughtExceptionMonitor", (error, origin) => {
  // Do not suppress an uncaught exception: the process may be corrupted and
  // should be restarted by its service manager. This preserves the root cause.
  logger.fatal(`Uncaught exception (${origin})`, error);
});

let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  logger.info(`Received ${signal}; shutting down Discord gateway...`);

  const forcedExit = setTimeout(() => {
    logger.fatal("Graceful shutdown timed out");
    process.exit(1);
  }, 10_000);
  forcedExit.unref();

  try {
    await client.shutdown();
    clearTimeout(forcedExit);
    process.exit(0);
  } catch (error) {
    logger.error("Graceful shutdown failed", error);
    process.exit(1);
  }
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

void main().catch(async (error) => {
  logger.fatal("Bot failed to start", error);

  try {
    await client.shutdown();
  } catch (shutdownError) {
    logger.error("Failed to clean up after startup error", shutdownError);
  }

  process.exitCode = 1;
});
