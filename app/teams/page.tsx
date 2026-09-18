import { leaderboard } from "../../data/leaderboard";
import { participants } from "../../data/participants";

export default function TeamsPage() {
  return (
    <main>
      <h1>Teams</h1>

      {leaderboard.map((team) => {
        const teamParticipants = participants.filter(
          (participant) => participant.teamId === team.id
        );

        return (
          <section key={team.id}>
            <h2>{team.name}</h2>
            <p>Rank: {team.rank}</p>
            <p>Points: {team.points}</p>
            <p>Participants: {teamParticipants.length}</p>

            <ul>
              {teamParticipants.map((participant) => (
                <li key={participant.id}>{participant.name}</li>
              ))}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
