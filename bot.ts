import { createBot, GatewayIntents } from "discordeno";
import { requireEnv } from "./helpers/env.ts";

const discordToken = requireEnv("DISCORD_TOKEN");

const client = createBot({
  // botId: config.discord.botID,
  token: discordToken,
  intents: GatewayIntents.Guilds,
  desiredProperties: {
    interaction: {
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
      context: true,
    },
  },
});

// client.transformers.desiredProperties.interaction = {
//   id: true,
//   applicationId: true,
//   type: true,
//   guildId: true,
//   channelId: true,
//   member: true,
//   user: true,
//   token: true,
//   version: true,
//   message: true,
//   data: true,
//   locale: true,
//   guildLocale: true,
//   appPermissions: true,
// };

export { client };
export type events = typeof client.events;
