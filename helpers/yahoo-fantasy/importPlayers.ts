import { MongoClient } from "mongodb";
import config from "../../config.ts";

const mongo = await MongoClient.connect(config.mongo.url);
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
  "tampa-bay"
]

for (const team of teamSlugs) {
  console.log(team);
  const url = `https://sports.yahoo.com/nfl/teams/${team}/roster/`;

  const req = await fetch(url).then((res) => res.text());

  const data = req
    .split("\n")[38]
    .replace("root.App.main = ", "")
    .replace(/;$/, "");

  const reactData = JSON.parse(data);
  const { players, positions } = reactData.context.dispatcher.stores.PlayersStore;

  for (const playerKey in players) {
    const playerData = players[playerKey];

    const name = playerData.display_name;
    const status = playerData.injury?.type;
    const statusFull = playerData.injury?.comment;

    const position = positions[playerData.primary_position_id].name;
    const positionAbbr = positions[playerData.primary_position_id].abbr;

    console.log(playerKey, name, status, statusFull, position, positionAbbr);

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
            statusFull
          }
        },
        { upsert: true },
      );
  }
}

await mongo.close();
