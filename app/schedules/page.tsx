import { events } from "../../data/events";
import { venues } from "../../data/venues";

export default function SchedulesPage() {
  return (
    <main>
      <h1>Schedules</h1>

      <section>
        <h2>Events</h2>

        {events.map((event) => (
          <div key={event.id}>
            <h3>{event.name}</h3>
            <p>
              {event.sport} - {event.category} - {event.type}
            </p>
          </div>
        ))}
      </section>

      <section>
        <h2>Venues</h2>

        {venues.map((venue) => (
          <div key={venue.id}>
            <h3>{venue.name}</h3>
            <p>
              {venue.type} - {venue.location}
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}
