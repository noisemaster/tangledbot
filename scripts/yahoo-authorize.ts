import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

import { requireEnv } from "../helpers/env.ts";
import {
  buildYahooAuthorizationUrl,
  closeYahooRedisClient,
  createYahooRedisClient,
  exchangeYahooAuthorizationCode,
  getAccessTokenCacheSeconds,
  storeYahooTokens,
  YAHOO_OUT_OF_BAND_REDIRECT_URI,
} from "../helpers/yahoo-fantasy/oauth.ts";

async function main(): Promise<void> {
  const clientId = requireEnv("YAHOO_CLIENT_ID");
  const clientSecret = requireEnv("YAHOO_CLIENT_SECRET");
  const redisUrl = requireEnv("REDIS_URL");

  if (!stdin.isTTY) {
    throw new Error("Run this command from an interactive terminal");
  }

  console.log("Open this URL and approve access to your Yahoo account:\n");
  console.log(buildYahooAuthorizationUrl(clientId));
  console.log();

  const prompt = createInterface({ input: stdin, output: stdout });
  let code: string;
  try {
    code = (await prompt.question("Paste the Yahoo authorization code: "))
      .trim();
  } finally {
    prompt.close();
  }

  if (!code) {
    throw new Error("No Yahoo authorization code was provided");
  }

  const tokens = await exchangeYahooAuthorizationCode({
    clientId,
    clientSecret,
    code,
    redirectUri: YAHOO_OUT_OF_BAND_REDIRECT_URI,
  });

  const redis = createYahooRedisClient(redisUrl);
  try {
    await redis.connect();
    await storeYahooTokens(redis, tokens);
  } finally {
    await closeYahooRedisClient(redis);
  }

  const cacheSeconds = getAccessTokenCacheSeconds(tokens.expiresInSeconds);
  console.log(
    `Yahoo credentials saved to Redis. The access token expires from the cache in ${cacheSeconds} seconds; the refresh token does not expire in Redis.`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Yahoo authorization failed: ${message}`);
  process.exitCode = 1;
});
