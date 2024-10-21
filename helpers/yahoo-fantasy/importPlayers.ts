import { MongoClient } from "mongodb";
import { XMLParser } from "fast-xml-parser";
import config from "../../config.ts";
import { getAccessToken } from "./mod.ts";

const importPlayers = async () => {
  const parser = new XMLParser();
  const mongo = await MongoClient.connect(config.mongo.url);
  const accessToken = await getAccessToken();
  const teamSlugs = [
    "buffalo",
    "miami",
    "new-england",
    "ny-jets",
    "denver",
    "kansas-city",
    "las-vegas",
    "la-chargers",
    "baltimore",
    "cincinnati",
    "cleveland",
    "pittsburgh",
    "houston",
    "indianapolis",
    "jacksonville",
    "tennessee",
    "dallas",
    "ny-giants",
    "philadelphia",
    "washington",
    "arizona",
    "la-rams",
    "san-francisco",
    "seattle",
    "chicago",
    "detroit",
    "green-bay",
    "minnesota",
    "atlanta",
    "carolina",
    "new-orleans",
    "tampa-bay",
  ];

  const dbStats = mongo.db("tangledbot").collection("stats").find({});
  const statMap: { [x: number]: any } = {};

  for await (const stat of dbStats) {
    statMap[stat.statId] = {
      name: stat.name,
      abbr: stat.abbr,
      cat: stat.group,
    };
  }

  for (const team of teamSlugs) {
    console.log(`Syncing players for ${team}`);
    const url = `https://sports.yahoo.com/nfl/teams/${team}/roster/`;

    const req = await fetch(url).then((res) => res.text());

    const data = req
      .split("\n")[38]
      .replace("root.App.main = ", "")
      .replace(/;$/, "");

    const reactData = JSON.parse(data);
    const { players, positions } =
      reactData.context.dispatcher.stores.PlayersStore;

    let currentTeamKey = "";

    for (const playerKey in players) {
      const playerData = players[playerKey];

      const name = playerData.display_name;
      const status = playerData.injury?.type;
      const statusFull = playerData.injury?.comment;

      const position = positions[playerData.primary_position_id].name;
      const positionAbbr = positions[playerData.primary_position_id].abbr;
      currentTeamKey = playerData.team_id;

      await mongo
        .db("tangledbot")
        .collection("players")
        .updateOne(
          {
            playerKey,
          },
          {
            $setOnInsert: {
              playerKey,
              name,
              position,
              positionAbbr,
              teamKey: playerData.team_id,
            },
            $set: {
              status,
              statusFull,
            },
          },
          { upsert: true },
        );
    }

    const dbPlayers = mongo
      .db("tangledbot")
      .collection("players")
      .find({
        teamKey: currentTeamKey,
        positionAbbr: {
          $in: ["QB", "WR", "K", "RB", "TE"],
        },
      });

    const keys = [];

    for await (const player of dbPlayers) {
      keys.push(player.playerKey);
    }

    console.log('syncing player stats');

    for (let week of Array(7).keys()) {
      const url = `https://fantasysports.yahooapis.com/fantasy/v2/league/nfl.l.494410/players;player_keys=${keys.join(",")}/stats;type=week;week=${week + 1}`;
      const req = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const rawXML = await req.text();
      const rawPlayer = parser.parse(rawXML);

      for (const player of rawPlayer.fantasy_content.league.players.player) {
        await mongo
          .db("tangledbot")
          .collection("playerStats")
          .updateOne(
            {
              playerKey: player.player_key,
              week: player.player_points.week,
            },
            {
              $set: {
                playerKey: player.player_key,
                playerName: player.name.full,
                week: player.player_points.week,
                points: player.player_points.total,
                stats: player.player_stats.stats.stat.map((row: any) => ({
                  statId: row.stat_id,
                  statName: statMap[row.stat_id].name,
                  statAbbr: statMap[row.stat_id].abbr,
                  statCat: statMap[row.stat_id].cat,
                  value: row.value,
                })),
              },
            },
            { upsert: true },
          );
      }
    }
  }
};

await importPlayers();
