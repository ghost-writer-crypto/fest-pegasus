import Link from "next/link";
import { sports } from "@/data/sports";
import { events } from "@/data/events";

export default function SportsPage() {
  return (
    <main className="pegasus-page pegasus-atmosphere pegasus-atmosphere--sports pegasus-animate-fade">
      <section className="pegasus-page__header">
        <p className="pegasus-eyebrow">COMPETITION DISCIPLINES</p>
        <h1 className="pegasus-page-title">Sports</h1>
        <p className="pegasus-page__description">
          Explore every sport and configured event scheduled across the Pegasus
          Sports Festival.
        </p>
      </section>

      <section className="pegasus-sports-grid-view">
        {sports.map((sport, index) => {
          const configuredEvents = events.filter(
            (event) => event.sport.toLowerCase() === sport.name.toLowerCase(),
          );

          return (
            <Link
              key={sport.id}
              href={`/sports/${sport.slug || sport.id}`}
              className="pegasus-card pegasus-card--interactive pegasus-sport-entry"
            >
              <div className="pegasus-sport-entry__top">
                <span className="pegasus-eyebrow">
                  {String(index + 1).padStart(2, "0")} / {sport.type}
                </span>

                <span className="pegasus-status pegasus-status--upcoming">
                  <span className="pegasus-status__dot" />
                  {configuredEvents.length}{" "}
                  {configuredEvents.length === 1 ? "Event" : "Events"}
                </span>
              </div>

              <div className="pegasus-sport-entry__body">
                <h2>{sport.name}</h2>
                {sport.description && <p>{sport.description}</p>}
              </div>

              <div className="pegasus-sport-entry__footer">
                <span className="pegasus-sport-entry__count">
                  {configuredEvents.length}{" "}
                  {configuredEvents.length === 1
                    ? "event configured"
                    : "events configured"}
                </span>

                <span className="pegasus-sport-entry__cta">
                  Explore events <span>↗</span>
                </span>
              </div>
            </Link>
          );
        })}
      </section>
    </main>
  );
}