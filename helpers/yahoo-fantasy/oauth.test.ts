import { describe, expect, test } from "bun:test";

import {
  buildYahooAuthorizationUrl,
  getAccessTokenCacheSeconds,
  YAHOO_OUT_OF_BAND_REDIRECT_URI,
} from "./oauth.ts";

describe("Yahoo OAuth helpers", () => {
  test("builds an out-of-band authorization URL", () => {
    const url = new URL(buildYahooAuthorizationUrl("client-id"));

    expect(url.origin + url.pathname).toBe(
      "https://api.login.yahoo.com/oauth2/request_auth",
    );
    expect(url.searchParams.get("client_id")).toBe("client-id");
    expect(url.searchParams.get("redirect_uri")).toBe(
      YAHOO_OUT_OF_BAND_REDIRECT_URI,
    );
    expect(url.searchParams.get("response_type")).toBe("code");
  });

  test("expires cached access tokens before Yahoo expires them", () => {
    expect(getAccessTokenCacheSeconds(3_600)).toBe(3_540);
    expect(getAccessTokenCacheSeconds(30)).toBe(1);
  });
});
