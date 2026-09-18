import { events } from "../../data/events";
import { participants } from "../../data/participants";
import { results } from "../../data/results";

export default function ResultsPage() {
  return (
    <main>
      <h1>Results</h1>

      {events.map((event) => {
        const eventResults = results.filter(
          (result) => result.eventId === event.id
        );

        if (eventResults.length === 0) {
          return null;
        }

        return (
          <section key={event.id}>
            <h2>{event.name}</h2>

            {eventResults.map((result) => {
              const participant = participants.find(
                (item) => item.id === result.participantId
              );

              return (
                <div key={result.id}>
                  <p>
                    {result.position}.{" "}
                    {participant?.name ?? "Unknown Participant"}
                  </p>
                  <p>
                    {result.performance} - {result.points} points
                  </p>
                </div>
              );
            })}
          </section>
        );
      })}
    </main>
  );
}
