import { MongoClient } from "mongodb";
import config from "./config.ts";

const client = new MongoClient(config.mongo.url);

const db = client.db("tangledbot");

const players = db.collection("players");
const stats = db.collection("playerStats");
const pipeline = [];
const embedded_pl = [];

// embedded_pl.push({
//   $set: {
//     joinablePlayerKey: {
//       $replaceAll: { input: "$playerKey", find: "nfl", replacement: "449" },
//     },
//   },
// });
//
// pipeline.push({
//   $match: {
//     playerKey: "nfl.p.30977",
//   },
// });
//
// pipeline.push({
//   $lookup: {
//     from: "playerStats",
//     let: {
//       pkey: "joinablePlayerKey",
//     },
//     pipeline: embedded_pl,
//     as: "stats",
//   },
// });
//
// // const aggregationResult = await players.aggregate(pipeline);
//
// const aggregationResult = await stats.find({
//   playerKey: '449.p.30977'
// }, { sort: ["week", 1] });

const aggregationResult = players.aggregate([
  { $match: { positionAbbr: 'WR' } },
  { $match: { $text: { $search: "brown" } } }
])

for await (const document of aggregationResult) {
  console.log(document);
}
console.log("done");

await client.close();

process.exit(0);
