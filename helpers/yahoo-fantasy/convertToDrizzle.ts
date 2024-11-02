import { db } from "../../drizzle";
import { MongoClient } from "mongodb";
import { League, Matchup, Player, Team, Transaction } from "../../drizzle/schema.ts";

const mongo = await MongoClient.connect(process.env.MONGODB_URL!);

const dbPlayers = mongo.db("tangledbot").collection("players").find({});

const dbTransactions = mongo
  .db("tangledbot")
  .collection("transactions")
  .find({});

const dbTeams = mongo.db("tangledbot").collection("teams").find({});

const dbLeagues = mongo.db("tangledbot").collection("leagues").find({});

const dbMatchups = mongo.db("tangledbot").collection("matchups").find({});

await db.transaction(async (tx) => {
  for await (const player of dbPlayers) {
    await tx.insert(Player).values({
      name: player.name,
      playerKey: player.playerKey,
      position: player.position,
      positionAbbr: player.positionAbbr,
      status: player.status,
      statusFull: player.statusFull,
      teamKey: player.teamKey,
    });
  }

  for await (const transaction of dbTransactions) {
    await tx.insert(Transaction).values({
      transactionKey: transaction.transactionKey,
      leagueId: transaction.leagueId,
      type: transaction.type,
      timestamp: transaction.timestamp,
      status: transaction.status,
      parentTransactionKey: transaction.parentTransactionKey,
      gameId: transaction.gameId,
      name: transaction.name,
      playerId: transaction.playerId,
      position: transaction.position,
      sourceType: transaction.sourceType,
      sourceTeam: transaction.sourceTeam,
      sourceTeamKey: transaction.sourceTeamKey,
      destinationType: transaction.destinationType,
      destinationTeam: transaction.destinationTeam,
      destinationTeamKey: transaction.destinationTeamKey,
    });
  }

  for await (const team of dbTeams) {
    await tx.insert(Team).values({
      teamKey: team.teamKey,
      leagueId: team.leagueId,
      sportId: team.sportId,
      logo: team.logo,
      manager: team.manager,
      managerAvatar: team.managerAvatar,
      name: team.name,
    });
  }

  for await (const league of dbLeagues) {
    await tx.insert(League).values({
      id: league.id,
      key: league.key,
      logo: league.logo,
      name: league.name,
      sportId: league.sportId,
      url: league.url,
    });
  }

  for await (const matchup of dbMatchups) {
    await tx.insert(Matchup).values({
      gameId: matchup.gameId,
      leagueId: matchup.leagueId,
      matchupKey: matchup.matchupKey || matchup.matchupId,
      team1Id: matchup.team1Id,
      team1Name: matchup.team1Name,
      team1Score: matchup.team1Score,
      team1ScoreTiming: matchup.team1ScoreTiming,
      team2Id: matchup.team2Id,
      team2Name: matchup.team2Name,
      team2Score: matchup.team2Score,
      team2ScoreTiming: matchup.team2ScoreTiming,
      week: matchup.week,
    });
  }
});

console.log("Done!");