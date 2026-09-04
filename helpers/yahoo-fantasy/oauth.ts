import { createClient } from "redis";

export const YAHOO_ACCESS_TOKEN_KEY = "accessToken";
export const YAHOO_REFRESH_TOKEN_KEY = "refreshToken";
export const YAHOO_OUT_OF_BAND_REDIRECT_URI = "oob";

const YAHOO_AUTHORIZE_URL = "https://api.login.yahoo.com/oauth2/request_auth";
const YAHOO_TOKEN_URL = "https://api.login.yahoo.com/oauth2/get_token";
const TOKEN_EXPIRY_SAFETY_SECONDS = 60;

export interface YahooTokens {
  accessToken: string;
  expiresInSeconds: number;
  refreshToken?: string;
}

interface YahooClientCredentials {
  clientId: string;
  clientSecret: string;
}

interface YahooAuthorizationCodeGrant extends YahooClientCredentials {
  code: string;
  redirectUri?: string;
}

interface YahooRefreshTokenGrant extends YahooClientCredentials {
  refreshToken: string;
  redirectUri?: string;
}

export type YahooRedisClient = ReturnType<typeof createClient>;

export function createYahooRedisClient(redisUrl: string): YahooRedisClient {
  const redis = createClient({
    url: redisUrl,
    socket: {
      connectTimeout: 5_000,
      reconnectStrategy: (retries) =>
        retries < 3
          ? Math.min(100 * 2 ** retries, 1_000)
          : new Error("Redis reconnect limit reached"),
    },
  });

  // Redis clients emit EventEmitter `error` events. Without a listener, an
  // otherwise recoverable connection error can terminate the process.
  redis.on("error", (error) => {
    console.error("Redis client error", error);
  });

  return redis;
}

export async function closeYahooRedisClient(
  redis: YahooRedisClient,
): Promise<void> {
  if (!redis.isOpen) return;

  try {
    await redis.quit();
  } catch (error) {
    console.error("Failed to close Redis client cleanly", error);
    redis.disconnect();
  }
}

export function buildYahooAuthorizationUrl(
  clientId: string,
  redirectUri = YAHOO_OUT_OF_BAND_REDIRECT_URI,
): string {
  const authorizationUrl = new URL(YAHOO_AUTHORIZE_URL);
  authorizationUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    language: "en-us",
  }).toString();

  return authorizationUrl.toString();
}

export function getAccessTokenCacheSeconds(expiresInSeconds: number): number {
  return Math.max(
    1,
    Math.floor(expiresInSeconds) - TOKEN_EXPIRY_SAFETY_SECONDS,
  );
}

export async function exchangeYahooAuthorizationCode(
  grant: YahooAuthorizationCodeGrant,
): Promise<YahooTokens> {
  const tokens = await requestYahooTokens(
    grant,
    new URLSearchParams({
      grant_type: "authorization_code",
      redirect_uri: grant.redirectUri ?? YAHOO_OUT_OF_BAND_REDIRECT_URI,
      code: grant.code,
    }),
  );

  if (!tokens.refreshToken) {
    throw new Error("Yahoo authorization response had no refresh token");
  }

  return tokens;
}

export function refreshYahooAccessToken(
  grant: YahooRefreshTokenGrant,
): Promise<YahooTokens> {
  return requestYahooTokens(
    grant,
    new URLSearchParams({
      grant_type: "refresh_token",
      redirect_uri: grant.redirectUri ?? YAHOO_OUT_OF_BAND_REDIRECT_URI,
      refresh_token: grant.refreshToken,
    }),
  );
}

export async function storeYahooTokens(
  redis: YahooRedisClient,
  tokens: YahooTokens,
): Promise<void> {
  const transaction = redis.multi().setEx(
    YAHOO_ACCESS_TOKEN_KEY,
    getAccessTokenCacheSeconds(tokens.expiresInSeconds),
    tokens.accessToken,
  );

  if (tokens.refreshToken) {
    transaction.set(YAHOO_REFRESH_TOKEN_KEY, tokens.refreshToken);
  }

  await transaction.exec();
}

async function requestYahooTokens(
  credentials: YahooClientCredentials,
  body: URLSearchParams,
): Promise<YahooTokens> {
  // Yahoo accepts HTTP Basic authentication for confidential clients. The
  // fields are also included in the body for compatibility with existing app
  // registrations.
  body.set("client_id", credentials.clientId);
  body.set("client_secret", credentials.clientSecret);

  const encodedCredentials = Buffer.from(
    `${credentials.clientId}:${credentials.clientSecret}`,
  ).toString("base64");
  const response = await fetch(YAHOO_TOKEN_URL, {
    method: "POST",
    body,
    headers: {
      Authorization: `Basic ${encodedCredentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    signal: AbortSignal.timeout(10_000),
  });

  const payload: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    const yahooError = getStringProperty(payload, "error");
    const detail = yahooError ? ` (${yahooError})` : "";
    throw new Error(
      `Yahoo token exchange failed with HTTP ${response.status}${detail}`,
    );
  }

  const accessToken = getStringProperty(payload, "access_token");
  if (!accessToken) {
    throw new Error("Yahoo token response had no access token");
  }

  const rawExpiresIn = getProperty(payload, "expires_in");
  const expiresInSeconds = Number(rawExpiresIn);
  if (!Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) {
    throw new Error("Yahoo token response had an invalid expiration");
  }

  const refreshToken = getStringProperty(payload, "refresh_token");

  return {
    accessToken,
    expiresInSeconds,
    ...(refreshToken ? { refreshToken } : {}),
  };
}

function getProperty(value: unknown, property: string): unknown {
  if (typeof value !== "object" || value === null) return undefined;
  return (value as Record<string, unknown>)[property];
}

function getStringProperty(value: unknown, property: string): string | undefined {
  const candidate = getProperty(value, property);
  return typeof candidate === "string" && candidate.length > 0
    ? candidate
    : undefined;
}
