# tangledbot

A Discord bot built with Bun and Discordeno.

## Development

```sh
bun install --frozen-lockfile
cp .env.example .env
bun run check
bun test
bun start
```

`DISCORD_TOKEN` is required for the bot itself. Command modules with missing
configuration are logged and skipped so that an optional integration cannot
prevent the rest of the bot from starting.

Yahoo Fantasy requires `DATABASE_URL`, `REDIS_URL`, `YAHOO_CLIENT_ID`, and
`YAHOO_CLIENT_SECRET`. Its graph command also requires `MONGODB_URL`. TMDB
commands require `TMDB_API_KEY`.

## Production

Run the bot under a service manager with restart-on-failure enabled. The bot
contains recoverable interaction failures and retries transient startup work,
but an uncaught exception is still allowed to exit: continuing after corrupted
process state is less safe than starting a fresh process.
