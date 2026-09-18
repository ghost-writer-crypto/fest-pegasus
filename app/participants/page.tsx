import { participants } from "../../data/participants";
import { teams } from "../../data/teams";

export default function ParticipantsPage() {
  return (
    <main>
      <h1>Participants</h1>

      {participants.map((participant) => {
        const team = teams.find(
          (item) => item.id === participant.teamId
        );

        return (
          <section key={participant.id}>
            <h2>{participant.name}</h2>
            <p>Participant ID: {participant.publicId}</p>
            <p>Team: {team?.name ?? "Unknown Team"}</p>
            <p>Category: {participant.category}</p>

            <ul>
              {participant.events.map((event) => (
                <li key={event}>{event}</li>
              ))}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
