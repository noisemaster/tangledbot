import {
  ApplicationCommandOptionTypes,
  ApplicationCommandTypes,
  ButtonStyles,
  Camelize,
  DiscordEmbed,
  Embed,
  InteractionResponseTypes,
  MessageComponentTypes,
  Bot,
  Interaction,
  MessageComponents,
} from "discordeno";

import { createCommand } from "./mod.ts";
import { updateInteraction } from "./lib/updateInteraction.ts";

export const sendMFLEmbed = async (bot: Bot, interaction: Interaction) => {
  console.log("mfl");

  try {
    await bot.helpers.sendInteractionResponse(
      interaction.id,
      interaction.token,
      {
        type: InteractionResponseTypes.DeferredChannelMessageWithSource,
      },
    );
  } catch (error) {
    console.error(error);
    return;
  }
  const leaderboard =
    "https://www.vulture.com/_components/leaderboard/instances/cmg5pj2fd000j3b749dri5fg8@published";
  const request = await fetch(leaderboard);
  const leaderboardData: any = await request.json();

  const fwListings = leaderboardData.players
    .filter((x: any) => x.leagueName === "fireworks pictures ltd")
    .map((x: any) => `${x.ranking}. ${x.displayName} (${x.score})`)
    .join("\n");

  console.log(fwListings);

  const components: any = [
    {
      type: 17 as any,
      components: [
        {
          type: 10 as any,
          content: fwListings,
        },
      ],
    },
  ];

  console.log(components);

  await updateInteraction(bot, interaction, {
    flags: 1 << 15,
    components,
  });
};

createCommand({
  name: "mfl",
  description: "Grabs the latest Vulture Movie Fantasy League scoreboard",
  execute: sendMFLEmbed,
  type: ApplicationCommandTypes.ChatInput,
});
