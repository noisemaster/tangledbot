import { ApplicationCommandTypes, Bot, Interaction } from "discordeno";

import { createCommand } from "./mod.ts";
import { updateInteraction } from "./lib/updateInteraction.ts";

export const sendMFLEmbed = async (_bot: Bot, interaction: Interaction) => {
  console.log("mfl");

  await interaction.defer();
  const leaderboard =
    "https://www.vulture.com/static/leaderboard/production/cmuec30my000h3b7egrtm2p6h.json";
  const request = await fetch(leaderboard);
  const leaderboardData: any = await request.json();

  const fwListings = leaderboardData
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

  await updateInteraction(interaction, {
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
