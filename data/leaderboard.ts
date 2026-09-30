import { results } from "./results";
import { teams } from "./teams";
import { calculateTeamPoints } from "@/lib/competition/pointsAggregation";
import { participants as demoParticipants } from "./participants";

const demoLookup = new Map(demoParticipants.map((p) => [p.id, p.teamId]));

export const leaderboard = teams
  .map((team) => ({
    ...team,
    points: calculateTeamPoints(results, team.id, [], demoLookup),
  }))
  .sort((a, b) => b.points - a.points)
  .map((team, index) => ({
    ...team,
    rank: index + 1,
  }));
