import { JSDOM } from "jsdom";
import { $ } from "bun";
import { MongoClient } from "mongodb";
import config from "../../config.ts";

const mongo = await MongoClient.connect(config.mongo.url);

const url = "https://sports.yahoo.com/nfl/teams/philadelphia/roster/";

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
          status,
          statusFull,
          position,
          positionAbbr,
          teamKey: playerData.team_id,
        },
      },
      { upsert: true },
    );
}

await mongo.close();
