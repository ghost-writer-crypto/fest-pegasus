import { results } from "./results";
import { teams } from "./teams";
import { calculateTeamPoints } from "@/lib/competition/pointsAggregation";

export const leaderboard = teams
  .map((team) => ({
    ...team,
    points: calculateTeamPoints(results, team.id),
  }))
  .sort((a, b) => b.points - a.points)
  .map((team, index) => ({
    ...team,
    rank: index + 1,
  }));
