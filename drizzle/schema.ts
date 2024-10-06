import { pgTable, integer, serial, json, timestamp, varchar, decimal } from "drizzle-orm/pg-core";}

export const league = pgTable("leagues", {
  id: serial("id").primaryKey(),
  leagueKey: varchar("league_key").notNull(),
  name: varchar("name").notNull(),
  logo: varchar("logo").notNull(),
  gameId: integer("game_id").notNull(),
  url: varchar("url").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const matchup = pgTable("matchups", {
  id: serial("id").primaryKey(),
  leagueId: integer("league_id").notNull(),
  matchupKey: varchar("matchup_key").notNull(),
  team1Id: integer("team1_id").notNull(),
  team2Id: integer("team2_id").notNull(),
  team1Score: decimal("team1_score").notNull(),
  team2Score: decimal("team2_score").notNull(),
  week: integer("week").notNull(),
  timing: json("timing").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const player = pgTable("players", {
  id: serial("id").primaryKey(),
  leagueId: integer("league_id").notNull(),
  playerId: integer("player_id").notNull(),
  playerKey: varchar("player_key").notNull(),
  name: varchar("name").notNull(),
  position: varchar("position").notNull(),
  positionAbbr: varchar("position_abbr").notNull(),
  teamId: integer("team_id").notNull(),
  status: varchar("status").notNull(),
  statusFull: varchar("status_full").notNull(),
  headshot: varchar("headshot").notNull(),
  byeWeek: integer("bye_week").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const stats = pgTable("stats", {
  id: serial("id").primaryKey(),
  sportId: integer("sport_id").notNull(),
  statId: integer("stat_id").notNull(),
  abbr: varchar("abbr").notNull(),
  group: varchar("group").notNull(),
  name: varchar("name").notNull(),
  posiionType: varchar("position_type").notNull(),
  sortOrder: integer("sort_order").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const leagueTeam = pgTable("league_teams", {
  id: serial("id").primaryKey(),
  leagueId: integer("league_id").notNull(),
  teamId: integer("team_id").notNull(),
  teamKey: varchar("team_key").notNull(),
  managerName: varchar("manager_name").notNull(),
  name: varchar("name").notNull(),
  logo: varchar("logo").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const transaction = pgTable("transactions", {
  id: serial("id").primaryKey(),
  destinationTeamId: integer("destination_team_id"),
  sourceTeamId: integer("source_team_id"),
  sourceType: varchar("source_type").notNull(),
  destinationType: varchar("destination_type").notNull(),
  gameId: varchar("game_id").notNull(),
  leagueId: integer("league_id").notNull(),
  playerName: varchar("player_name").notNull(),
  parentTransactionId: integer("parent_transaction_id"),
  transactionId: integer("transaction_id").notNull(),
  type: varchar("type").notNull(),
  winningBid: decimal("winning_bid").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
