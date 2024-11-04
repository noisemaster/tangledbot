import { relations, sql } from "drizzle-orm";
import {
  integer,
  text,
  json,
  timestamp,
  pgTable,
  decimal,
  index,
} from "drizzle-orm/pg-core";

export type PlayerStatObj = {
  statAbbr: string;
  statCat: string;
  statId: number;
  statName: string;
  value: number;
};

export const Game = pgTable("games", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  sport: text("sport"),
  year: text("year"),
});

export const League = pgTable("leagues", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  key: text("key"),
  logo: text("logo"),
  name: text("name"),
  sportId: integer("sportId"),
  url: text("url"),
});

// Matchups table
export const Matchup = pgTable("matchups", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  gameId: text("gameId"),
  leagueId: text("leagueId"),
  matchupId: text("matchupId"),
  matchupKey: text("matchupKey"),
  team1Id: text("team1Id"),
  team1Name: text("team1Name"),
  team1Score: decimal("team1Score"),
  team1ScoreTiming: json("team1ScoreTiming"),
  team2Id: text("team2Id"),
  team2Name: text("team2Name"),
  team2Score: decimal("team2Score"),
  team2ScoreTiming: json("team2ScoreTiming"),
  week: integer("week"),
});

// PlayerStats table
export const PlayerStat = pgTable("playerStats", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  playerKey: text("playerKey"),
  playerName: text("playerName"),
  points: decimal("points"),
  stats: json("stats").$type<PlayerStatObj[]>(),
  week: integer("week"),
});

// Players table
export const Player = pgTable(
  "players",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    name: text("name"),
    playerKey: text("playerKey"),
    position: text("position"),
    positionAbbr: text("positionAbbr"),
    status: text("status"),
    statusFull: text("statusFull"),
    teamKey: text("teamKey"),
  },
  (table) => ({
    nameSearchIndex: index("name_search_index").using(
      "gin",
      sql`to_tsvector('english', ${table.name})`
    ),
  })
);

// Stats table
export const Stat = pgTable("stats", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  abbr: text("abbr"),
  group: text("group"),
  name: text("name"),
  positionType: text("positionType"),
  sortOrder: integer("sortOrder"),
  sportId: integer("sportId"),
  statId: integer("statId"),
});

// Teams table
export const Team = pgTable("teams", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  leagueId: integer("leagueId"),
  logo: text("logo"),
  manager: text("manager"),
  managerAvatar: text("managerAvatar"),
  name: text("name"),
  sportId: integer("sportId"),
  teamKey: text("teamKey"),
});

// Transactions table
export const Transaction = pgTable("transactions", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  destinationTeam: text("destinationTeam"),
  destinationTeamKey: text("destinationTeamKey"),
  destinationType: text("destinationType"),
  gameId: text("gameId"),
  leagueId: text("leagueId"),
  name: text("name"),
  parentTransactionKey: text("parentTransactionKey"),
  playerId: text("playerId"),
  position: text("position"),
  sourceTeam: text("sourceTeam"),
  sourceTeamKey: text("sourceTeamKey"),
  sourceType: text("sourceType"),
  status: text("status"),
  timestamp: timestamp("timestamp"),
  transactionKey: text("transactionKey"),
  type: text("type"),
  winningFaabBid: integer("winningFaabBid"),
});

export const PlayerRelations = relations(Player, ({many}) => ({
  stats: many(PlayerStat)
})) 

export const PlayerStatRelations = relations(PlayerStat, ({one}) => ({
  player: one(Player, {
    fields: [PlayerStat.playerKey],
    references: [Player.playerKey],
  })
}))