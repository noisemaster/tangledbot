import { Embed, Interaction, InteractionResponseType } from 'https://deno.land/x/harmony@v2.0.0-rc1/mod.ts'
import { EmbedField } from "https://deno.land/x/harmony@v2.0.0-rc1/src/types/channel.ts";
import { sub, differenceInDays, format, isAfter } from "https://deno.land/x/date_fns@v2.15.0/index.js";

// Format shared between League and Valorant's esport sites
interface RiotFixture {
    startTime: string;
    state: 'unstarted' | 'inProgress' | 'completed';
    type: string;
    blockName: string;
    league: {
        name: string;
        slug: string;
        region: string;
    };
    tournament: {
        split: {
            name: string | null;
        };
        season: {
            name: string | null;
        };
    };
    match: {
        id: string;
        flags: string[];
        teams: {
            name: string;
            code: string;
            image: string;
            result: {
                outcome: 'win' | 'loss';
                gameWins: number;
            } | null;
            record: {
                wins: number,
                losses: number
            } | null;
        }[],
        strategy: {
            type: string;
            count: number;
        };
    };
}

// Challengers, Regional Masters, and International Masters have different leagues setup for them in the site
const regionLeagueMap = {
    na: [],
    eu: [],
    kr: [],
    br: [],
};

export const sendValorantFixtureEmbed = async (interaction: Interaction) => {
    if (!interaction.data) {
        return;
    }

    const [region] = interaction.data.options;

    const scheduleReq = await fetch(
        `https://esports-api.service.valorantesports.com/persisted/val/getSchedule?hl=en-US&sport=val&leagueId=${region.value}`,
        {
            headers: {
                // Apparently this is just a hardcoded constant shared between
                // valorantesports.com and lolesports.com
                // Who knew
                'x-api-key': '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z'
            }
        }
    );

    const {data: {schedule}} = await scheduleReq.json();
    const {updated: updateTime, events} = schedule;
    const twoDaysAgo = sub(new Date(), {days: 2});
    const eventFields = events
        .filter((event: RiotFixture) => {
            const matchDate = Date.parse(event.startTime);
            const dayDiff = differenceInDays(twoDaysAgo, matchDate);
            const isInFuture = isAfter(matchDate, twoDaysAgo);

            return isInFuture || (!isInFuture && differenceInDays(matchDate, dayDiff) <= 2);
        })
        .map((event: RiotFixture) => {
            const [team1, team2] = event.match.teams;
            const date = Date.parse(event.startTime);

            const gameData = `${event.league.name} - ${event.blockName}\n${format(date, 'MMMM d, yyyy h:mm a z', undefined)}`

            const field: EmbedField = {
                name: `${team1.name} vs. ${team2.name}`,
                value: gameData,
                inline: true,
            };

            return field;
        });

    const embed = new Embed({
        title: 'Recent & Upcoming Valorant Matches',
        fields: eventFields,
        // footer: {
        //     text: 'Last Updated'
        // },
        // timestamp: updateTime,
    });

    await interaction.respond({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        embeds: [embed]
    });
}