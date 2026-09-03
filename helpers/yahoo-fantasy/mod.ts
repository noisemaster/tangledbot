import { createClient } from "redis";
import { db } from "../../drizzle/index.ts";
import { XMLParser } from "fast-xml-parser";
import { Matchup, Player, Transaction } from "../../drizzle/schema.ts";
import { requireEnv } from "../env.ts";

interface ParsedStandings {
  name: string;
  points: number;
  wins: number;
  losses: number;
  ties: number;
}

interface ScoreboardTeam {
  name: string;
  teamKey: string;
  actualPoints: number;
  projectedPoints: number;
  winProbability: number;
}

interface ParsedScoreboard {
  team1: ScoreboardTeam;
  team2: ScoreboardTeam;
  id: string;
}

export const getAccessToken = async (): Promise<string> => {
  const redis = createClient({
    url: requireEnv("REDIS_URL"),
    socket: {
      connectTimeout: 5_000,
      reconnectStrategy: (retries) =>
        retries < 3
          ? Math.min(100 * 2 ** retries, 1_000)
          : new Error("Redis reconnect limit reached"),
    },
  });

  // Redis clients emit EventEmitter `error` events. An error without a
  // listener is process-fatal in Node-compatible runtimes.
  redis.on("error", (error) => {
    console.error("Redis client error", error);
  });

  try {
    await redis.connect();

    let accessToken = await redis.get("accessToken");

    if (!accessToken) {
      console.log("Refreshing Yahoo Fantasy Token");

      const refreshToken = await redis.get("refreshToken");

      if (!refreshToken) {
        throw new Error("Yahoo refresh token is missing from Redis");
      }

      const clientId = requireEnv("YAHOO_CLIENT_ID");
      const clientSecret = requireEnv("YAHOO_CLIENT_SECRET");
      const encoded = btoa(`${clientId}:${clientSecret}`);

      const refreshRequest = await fetch(
        "https://api.login.yahoo.com/oauth2/get_token",
        {
          method: "POST",
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: "oob",
            refresh_token: refreshToken,
            grant_type: "refresh_token",
          }),
          headers: {
            Authorization: `Basic ${encoded}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          signal: AbortSignal.timeout(10_000),
        },
      );

      if (!refreshRequest.ok) {
        throw new Error(
          `Yahoo token refresh failed with HTTP ${refreshRequest.status}`,
        );
      }

      const refreshJson: any = await refreshRequest.json();

      if (typeof refreshJson.access_token !== "string") {
        throw new Error("Yahoo token refresh response had no access token");
      }

      accessToken = refreshJson.access_token;
      const expiresIn = Number(refreshJson.expires_in);
      const cacheSeconds = Number.isFinite(expiresIn)
        ? Math.max(60, expiresIn - 60)
        : 300;

      await redis.setEx(
        "accessToken",
        cacheSeconds,
        refreshJson.access_token as string,
      );

      if (typeof refreshJson.refresh_token === "string") {
        await redis.set("refreshToken", refreshJson.refresh_token);
      }
    }

    return accessToken!;
  } finally {
    if (redis.isOpen) {
      try {
        await redis.quit();
      } catch (error) {
        console.error("Failed to close Redis client cleanly", error);
        redis.disconnect();
      }
    }
  }
};

export const fetchStandings = async (
  accessToken: string,
  leagueId: string = "581427",
) => {
  const standingsRequestXML = await fetch(
    `https://fantasysports.yahooapis.com/fantasy/v2/league/nfl.l.${leagueId}/standings`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const rawXML = await standingsRequestXML.text();
  const parser = new XMLParser();

  const rawStandings = parser.parse(rawXML);

  const parsedStandings: ParsedStandings[] = [];

  const league = rawStandings.fantasy_content.league;
  const standings = rawStandings.fantasy_content.league.standings.teams.team;

  for (const board of standings) {
    parsedStandings.push({
      name: board.name,
      points: board.team_standings.points_for,
      wins: board.team_standings.outcome_totals.wins,
      losses: board.team_standings.outcome_totals.losses,
      ties: board.team_standings.outcome_totals.ties,
    });
  }

  return {
    league: {
      name: league.name,
      url: league.url,
      logo: league.logo_url,
    },
    standings: parsedStandings,
  };
};

export const fetchScoreboard = async (
  accessToken: string,
  leagueId: string = "581427",
  gameId = "nfl",
) => {
  const scoreboardRequest = await fetch(
    `https://fantasysports.yahooapis.com/fantasy/v2/league/${gameId}.l.${leagueId}/scoreboard`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const rawScoreboard = await scoreboardRequest.text();
  const parser = new XMLParser();

  const json = parser.parse(rawScoreboard);

  const parsedScoreboard: ParsedScoreboard[] = [];

  const league = json.fantasy_content.league;
  const matchups = json.fantasy_content.league.scoreboard.matchups.matchup;
  let weekNumber = 0;

  for (const matchup of matchups) {
    weekNumber = matchup.week;

    const matchupTeams = matchup.teams.team;
    const matchupId = league.league_key +
      `.mu.${matchupTeams[0].team_id}.v.${matchupTeams[1].team_id}`;

    const team1 = {
      name: matchupTeams[0].name,
      teamKey: matchupTeams[0].team_key,
      actualPoints: matchupTeams[0].team_points.total,
      projectedPoints: matchupTeams[0].team_projected_points.total,
      winProbability: matchupTeams[0].win_probability,
    };

    const team2 = {
      name: matchupTeams[1].name,
      teamKey: matchupTeams[1].team_key,
      actualPoints: matchupTeams[1].team_points.total,
      projectedPoints: matchupTeams[1].team_projected_points.total,
      winProbability: matchupTeams[1].win_probability,
    };

    parsedScoreboard.push({
      team1,
      team2,
      id: matchupId,
    });
  }

  return {
    league: {
      name: league.name,
      url: league.url,
      logo: league.logo_url,
      week: weekNumber,
    },
    scoreboard: parsedScoreboard,
  };
};

export async function addPoints() {
  const accessToken = await getAccessToken();
  const { scoreboard, league } = await fetchScoreboard(accessToken);

  const now = Date.now();
  for (const entry of scoreboard) {
    const currentData = await db.query.Matchup.findFirst({
      where: (matchup, { eq }) => eq(matchup.matchupKey, entry.id),
    });

    let team1ScoreTiming = [];
    let team2ScoreTiming = [];

    if (currentData) {
      team1ScoreTiming = JSON.parse(currentData.team1ScoreTiming as string);
      team2ScoreTiming = JSON.parse(currentData.team2ScoreTiming as string);
    }

    team1ScoreTiming.push([
      now,
      entry.team1.actualPoints,
      entry.team1.winProbability,
    ]);
    team2ScoreTiming.push([
      now,
      entry.team2.actualPoints,
      entry.team2.winProbability,
    ]);

    await db.insert(Matchup).values(
      {
        matchupKey: entry.id,
        gameId: "nfl",
        leagueId: "581427",
        week: league.week,
        team1Id: entry.team1.teamKey,
        team2Id: entry.team2.teamKey,
        team1ScoreTiming,
        team2ScoreTiming,
        team1Name: entry.team1.name,
        team2Name: entry.team2.name,
        team1Score: String(entry.team1.actualPoints),
        team2Score: String(entry.team2.actualPoints),
      },
    ).onConflictDoUpdate({
      target: Matchup.id,
      set: {
        team1ScoreTiming,
        team2ScoreTiming,
        team1Name: entry.team1.name,
        team2Name: entry.team2.name,
        team1Score: String(entry.team1.actualPoints),
        team2Score: String(entry.team2.actualPoints),
      },
    });
  }
}

export const listGames = async () => {
  const games = await db.query.Matchup.findMany({
    where: (matchup, { eq }) => eq(matchup.gameId, "nfl"),
    orderBy: (matchup, { asc }) => asc(matchup.week),
  });

  return games.map((x) => ({
    week: x.week,
    team1: x.team1Name,
    team2: x.team2Name,
    key: x.matchupKey,
  }));
};

export const getTransactions = async (
  accessToken: string,
  leagueId: string = "581427",
  gameId = "nfl",
) => {
  const tradesRequest = await fetch(
    `https://fantasysports.yahooapis.com/fantasy/v2/league/${gameId}.l.${leagueId}/transactions;types=add,drop,trade;status=accepted`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const tradesText = await tradesRequest.text();
  const parser = new XMLParser();

  const rawTrades = parser.parse(tradesText);
  console.log(rawTrades);

  const league = rawTrades.fantasy_content.league;
  const transactions = league.transactions.transaction;

  return {
    league: {
      name: league.name,
      url: league.url,
      logo: league.logo_url,
    },
    transactions,
  };
};

export const getTeams = async (
  accessToken: string,
  leagueId = "581427",
  gameId = "nfl",
) => {
  const tradesRequest = await fetch(
    `https://fantasysports.yahooapis.com/fantasy/v2/league/${gameId}.l.${leagueId}/teams`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const rawXML = await tradesRequest.text();
  const parser = new XMLParser();

  const json = parser.parse(rawXML);

  return json;
};

export const getPlayerDetails = async (
  accessToken: string,
  playerId = "1353821",
  gameId = "nfl",
) => {
  // check if player exists
  // const dbPlayer = await mongo
  //     .db('tangledbot')
  //     .collection('players')
  //     .findOne({playerId});

  // if (dbPlayer) {
  //     dbPlayer.name = {
  //         full: dbPlayer.name,
  //     }
  //     return dbPlayer;
  // }

  const playerRequest = await fetch(
    `https://fantasysports.yahooapis.com/fantasy/v2/players;player_keys=${gameId}.p.${playerId}/stats`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const rawXML = await playerRequest.text();
  const parser = new XMLParser();

  const json = parser.parse(rawXML);

  const player = json.fantasy_content.players.player;

  await db.insert(Player).values({
    playerKey: player.player_key,
    teamKey: player.editorial_team_key,
    name: player.name.full,
    status: player.status,
    statusFull: player.status_full,
    position: player.display_position,
    positionAbbr: player.display_position_abbr,
  });

  return json;
};

export const collectTransactions = async () => {
  const accessToken = await getAccessToken();
  const { league, transactions } = await getTransactions(accessToken, "581427");

  const embedsToSend: any[] = [];

  for (const apiTransaction of transactions) {
    const dataExists = await db.query.Transaction.findFirst({
      where: (transaction, { eq }) =>
        eq(transaction.parentTransactionKey, apiTransaction.transaction_key),
    });

    if (dataExists) {
      continue;
    }

    if (!Array.isArray(apiTransaction.players.player)) {
      apiTransaction.players.player = [apiTransaction.players.player];
    }

    for (const [index, player] of apiTransaction.players.player.entries()) {
      console.log(player);

      await db.insert(Transaction).values(
        {
          transactionKey: `${apiTransaction.transaction_key}.${index}`,
          leagueId: "581427",
          type: apiTransaction.type,
          timestamp: new Date(apiTransaction.timestamp * 1000),
          status: player.transaction_data.type,
          parentTransactionKey: apiTransaction.transaction_key,
          gameId: "nfl",
          name: player.name.full,
          playerId: player.player_key,
          position: player.position,
          sourceType: player.transaction_data.source_type,
          sourceTeam: player.transaction_data.source_team_name,
          sourceTeamKey: player.transaction_data.source_team_key,
          destinationType: player.transaction_data.destination_type,
          destinationTeam: player.transaction_data.destination_team_name,
          destinationTeamKey: player.transaction_data.destination_team_key,
          winningFaabBid: player.faab_bid || null,
        },
      );
    }

    const destinations: { [dest: string]: any } = {};

    for (const player of apiTransaction.players.player) {
      let destination = player.transaction_data.destination_team_name ||
        player.transaction_data.destination_type;

      if (destination === "waivers" && player.type === "drop") {
        destination =
          `Dropped from ${player.transaction_data.source_team_name}`;
      }

      if (!destinations[destination]) {
        destinations[destination] = [];
      }

      destinations[destination].push(player);
    }

    const fields = [];

    for (const destination in destinations) {
      let cleanDest = destination;
      if (destination === "waivers") {
        cleanDest = "Waivers";
      } else if (destination === "freeagents") {
        cleanDest = "Free Agency";
      }

      const playersTo = destinations[destination];

      fields.push({
        name: "To " + cleanDest,
        value: playersTo
          .map((player: any) => {
            return `${player.name.full}\n${player.editorial_team_abbr} - ${player.display_position}`;
          })
          .join("\n"),
      });
    }

    // let description = transaction.players.player.map((p: any) => {
    //     let source, destination;
    //     const type = p.transaction_data.type;
    //     const source_type = p.transaction_data.source_type;
    //     const destination_type = p.transaction_data.destination_type;
    //     if (source_type === 'team') {
    //         source = p.transaction_data.source_team_name;
    //     } else {
    //         source = p.transaction_data.source_type;
    //     }
    //     if (destination_type === 'team') {
    //         destination = p.transaction_data.destination_team_name;
    //     } else {
    //         destination = p.transaction_data.destination_type;
    //     }
    //
    //     const typeEmoji = type === 'add' ? '🔺' : type === 'drop' ? '🔻' : '🔄';
    //
    //     const finalMessage = `${p.name.full} (${p.editorial_team_abbr} - ${p.display_position}) ${typeEmoji} ${source} -> ${destination}`;
    // }).join('\n');

    if (apiTransaction.faab_bid) {
      fields.push({
        name: "Winning Bid",
        value: `${apiTransaction.faab_bid}`,
      });
    }

    const embed = {
      title: "New Transaction",
      fields,
      timestamp: new Date(apiTransaction.timestamp * 1000).toISOString(),
    };

    console.log(embed);

    embedsToSend.push(embed);
  }

  // Collect embeds in groups of 10
  const embedGroups: any[] = [];

  for (let i = 0; i < embedsToSend.length; i += 10) {
    embedGroups.push(embedsToSend.slice(i, i + 10));
  }

  for (const group of embedGroups) {
    const webhookData = {
      username: league.name,
      avatar_url: league.logo,
      embeds: group,
    };

    // Send embeds to discord
    const webhookResponse = await fetch(requireEnv("YAHOO_DISCORD_WEBHOOK"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(webhookData),
      signal: AbortSignal.timeout(10_000),
    });

    if (!webhookResponse.ok) {
      throw new Error(
        `Yahoo webhook failed with HTTP ${webhookResponse.status}`,
      );
    }
  }
};
