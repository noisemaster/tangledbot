import {
  ApplicationCommandOptionTypes,
  ApplicationCommandTypes,
  Bot,
  Camelize,
  DiscordEmbed,
  FileContent,
  Interaction,
  InteractionCallbackData,
} from "discordeno";

import { createCommand } from "./mod.ts";
import {
  fetchScoreboard,
  fetchStandings,
  getAccessToken,
  listGames,
} from "../helpers/yahoo-fantasy/mod.ts";

import Fuse from "fuse.js";
import { requireEnv } from "../helpers/env.ts";
import { updateInteraction } from "./lib/updateInteraction.ts";
import { db } from "../drizzle/index.ts";

export const sendStandingsEmbed = async (
  _bot: Bot,
  interaction: Interaction,
) => {
  await interaction.defer();

  const accessToken = await getAccessToken();
  const { league, standings } = await fetchStandings(accessToken);

  const embed: Camelize<DiscordEmbed> = {
    author: {
      name: league.name,
      url: league.url,
      iconUrl: league.logo,
    },
  };
  embed.fields = standings.map((data, index) => {
    return {
      name: `${index + 1}: ${data.name}`,
      value: `${data.points} (${data.wins} - ${data.losses}${
        data.ties ? ` - ${data.ties}` : ""
      })`,
      inline: false,
    };
  });

  await updateInteraction(interaction, {
    embeds: [embed],
  });
};

export const sendScoreboardEmbed = async (
  _bot: Bot,
  interaction: Interaction,
) => {
  await interaction.defer();

  const accessToken = await getAccessToken();
  const { league, scoreboard } = await fetchScoreboard(accessToken);

  const embed: Camelize<DiscordEmbed> = {
    author: {
      name: league.name,
      url: league.url,
      iconUrl: league.logo,
    },
    title: `Week ${league.week}`,
  };
  embed.fields = scoreboard.map((data, index) => {
    return {
      name: `Matchup ${index + 1}`,
      value:
        `${data.team1.name}: ${data.team1.actualPoints} (Projected: ${data.team1.projectedPoints}) - Win Probability ${
          (data.team1.winProbability * 100).toFixed(0)
        }%\n${data.team2.name}: ${data.team2.actualPoints} (Projected: ${data.team2.projectedPoints}) - Win Probability ${
          (data.team2.winProbability * 100).toFixed(0)
        }%`,
      inline: false,
    };
  });

  console.log(embed);

  await updateInteraction(interaction, {
    embeds: [embed],
  });
};

export const sendScoringGraph = async (_bot: Bot, interaction: Interaction) => {
  const interactionData: any = interaction.data;
  const detailsOption = interactionData.options.find(
    (option: any) => option.name === "graph",
  );
  const searchGameOption: any = detailsOption
    ? detailsOption.options.find((option: any) => option.name === "game")
    : null;
  const searchGame: string = searchGameOption ? searchGameOption.value : "";

  const image = await fetchChart(searchGame);

  const payload: InteractionCallbackData = {};

  const imageAttach: FileContent = {
    name: `${searchGame}.png`,
    blob: new Blob([image]) as any,
  };
  payload.files = [imageAttach];

  await interaction.respond(payload);
};

export const handleGraphAutocomplete = async (
  _bot: Bot,
  interaction: Interaction,
) => {
  const interactionData: any = interaction.data;
  const detailsOption = interactionData.options.find(
    (option: any) => option.name === "graph",
  );
  const searchGameOption: any = detailsOption
    ? detailsOption.options.find((option: any) => option.name === "game")
    : null;
  const searchGame: string = searchGameOption ? searchGameOption.value : "";

  const games = await listGames();

  const fuse = new Fuse(games, {
    keys: ["week", "team1", "team2", "key"],
  });

  const searchResults = fuse.search(searchGame);

  const formattedResults = searchResults
    .map((results) => ({
      name:
        `Week ${results.item.week}: ${results.item.team1} vs ${results.item.team2}`,
      value: results.item.key!,
    }))
    .slice(0, 25);

  await interaction.respond({ choices: formattedResults });
};

export const handlePlayerAutocomplete = async (
  _bot: Bot,
  interaction: Interaction,
) => {
  const interactionData: any = interaction.data;
  const detailsOption = interactionData.options.find(
    (option: any) => option.name === "details",
  );
  const searchPlayerOption: any = detailsOption
    ? detailsOption.options.find((option: any) => option.name === "player")
    : null;
  const searchPlayer: string = searchPlayerOption
    ? searchPlayerOption.value
    : "";

  if (searchPlayer === "") {
    console.log("empty");
    await interaction.respond({
      choices: [
        {
          name: "Player",
          value: "player",
        },
      ],
    });
    return;
  }

  try {
    const players = await db.query.Player.findMany({
      // extras: {
      //   rank: (player, {sql}) => sql<number>`ts_rank(to_tsvector('english', ${player.name}) @@ to_tsquery('english', ${query}))`.as('rank')
      // },
      where: (player, { inArray, and, sql }) =>
        and(
          inArray(player.positionAbbr, ["QB", "RB", "WR", "TE", "K"]),
          sql`to_tsvector('english', ${player.name}) @@ websearch_to_tsquery(${
            searchPlayer.trim() + ":*"
          })`,
        ),
      // orderBy: (player, { desc }) => desc(player.rank),
    });

    const formattedResults = players
      .map((player) => ({
        name: `${player.name} (${player.positionAbbr})`,
        value: player.playerKey!,
      }))
      .slice(0, 25);

    await interaction.respond({ choices: formattedResults });
  } catch (err) {
    throw new Error("Player autocomplete failed", { cause: err });
  }
};

export const sendPlayerDetails = async (
  _bot: Bot,
  interaction: Interaction,
) => {
  const interactionData: any = interaction.data;
  const detailsOption = interactionData.options.find(
    (option: any) => option.name === "details",
  );
  const searchPlayerOption: any = detailsOption
    ? detailsOption.options.find((option: any) => option.name === "player")
    : null;
  const searchPlayer: string = searchPlayerOption
    ? searchPlayerOption.value
    : "";

  await interaction.defer();

  const player = await db.query.Player.findFirst({
    where: (player, { eq }) => eq(player.playerKey, searchPlayer),
    with: {
      stats: {
        orderBy: (stat, { desc }) => desc(stat.week),
        limit: 4,
      },
    },
  });

  if (!player) {
    await updateInteraction(interaction, {
      content: "Player not found",
    });
    return;
  }

  const statSummary = player.stats
    .map((stat) => {
      const breakdown = (stat.stats || [])
        .filter((x) => x.value)
        .map(
          (x) =>
            `${x.value} ${
              x.statCat[0].toUpperCase() + x.statCat.substring(1)
            } ${x.statAbbr}`,
        )
        .join(", ");

      return `Week ${stat.week}: ${stat.points}\n${
        breakdown ? `-# ${breakdown}` : ""
      }`;
    })
    .join("\n");

  const embed: Camelize<DiscordEmbed> = {
    title: player.name!,
    url: `https://fantasysports.yahoo.com/nfl/players/${player.playerKey!}`,
    description: `Points for ${player.name}\n${statSummary}`,
    thumbnail: {
      url: player.headshot!,
    },
  };

  await updateInteraction(interaction, {
    embeds: [embed],
  });
};

const fetchChart = async (game: string): Promise<ArrayBuffer> => {
  const mongoUrl = requireEnv("MONGODB_URL");
  const badger = Bun.spawn({
    cmd: ["python3", "./helpers/scoring.py", game, mongoUrl],
    stdout: "pipe",
    stderr: "pipe",
  });

  const [output, errorOutput, code] = await Promise.all([
    new Response(badger.stdout).arrayBuffer(),
    new Response(badger.stderr).text(),
    badger.exited,
  ]);

  if (code !== 0) {
    throw new Error(`Chart process exited with code ${code}: ${errorOutput}`);
  }

  if (output.byteLength === 0) {
    throw new Error("Chart process returned no image data");
  }

  return output;
};

createCommand({
  name: "fantasy",
  description: "View Yahoo Fantasy details",
  type: ApplicationCommandTypes.ChatInput,
  subcommands: [
    {
      name: "standings",
      description: "View league standings",
      execute: sendStandingsEmbed,
      type: ApplicationCommandTypes.ChatInput,
    },
    {
      name: "scoreboard",
      description: "View league scoreboard",
      execute: sendScoreboardEmbed,
      type: ApplicationCommandTypes.ChatInput,
    },
    {
      name: "graph",
      description: "View points of a specific game",
      options: [
        {
          name: "game",
          description: "Game to view point graph for",
          type: ApplicationCommandOptionTypes.String,
          autocomplete: true,
          required: true,
        },
      ],
      execute: sendScoringGraph,
      autocomplete: handleGraphAutocomplete,
      type: ApplicationCommandTypes.ChatInput,
    },
    {
      name: "details",
      description: "Get details about a player",
      execute: sendPlayerDetails,
      autocomplete: handlePlayerAutocomplete,
      type: ApplicationCommandTypes.ChatInput,
      options: [
        {
          name: "player",
          description: "Player to get info about",
          type: ApplicationCommandOptionTypes.String,
          required: true,
          autocomplete: true,
        },
      ],
    },
  ],
  execute: () => {},
});
