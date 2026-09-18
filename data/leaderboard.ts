import { participants } from "./participants";
import { results } from "./results";
import { teams } from "./teams";

export const leaderboard = teams
  .map((team) => {
    const teamParticipantIds = participants
      .filter((participant) => participant.teamId === team.id)
      .map((participant) => participant.id);

    const points = results
      .filter((result) => teamParticipantIds.includes(result.participantId))
      .reduce((total, result) => total + result.points, 0);

    return {
      ...team,
      points,
    };
  })
  .sort((a, b) => b.points - a.points)
  .map((team, index) => ({
    ...team,
    rank: index + 1,
  }));
