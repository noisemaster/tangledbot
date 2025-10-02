import { createBot, GatewayIntents } from "discordeno";

const client = createBot({
  // botId: config.discord.botID,
  token: process.env.DISCORD_TOKEN!,
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
