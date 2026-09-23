import Link from "next/link";
import { notFound } from "next/navigation";
import { sports } from "@/data/sports";
import { events } from "@/data/events";
import { resolveFestivalEvent } from "@/lib/competition/eventResolver";
import { CODEX_DIVISIONS } from "@/lib/competition/divisions";

type SportPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SportPage({ params }: SportPageProps) {
  const { id } = await params;

  const sport = sports.find(
    (item) => item.id.toLowerCase() === id.toLowerCase() || item.slug?.toLowerCase() === id.toLowerCase(),
  );

  if (!sport) {
    notFound();
  }

  const sportEvents = events.filter(
    (event) => event.sport.toLowerCase() === sport.name.toLowerCase(),
  );

  return (
    <main className="pegasus-page pegasus-atmosphere pegasus-atmosphere--sports pegasus-animate-fade">
      <Link href="/sports" className="pegasus-back">
        ← All sports
      </Link>

      <section className="pegasus-page__header pegasus-sport-hero">
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
          <span className="pegasus-eyebrow" style={{ margin: 0 }}>
            {sport.type} Sport
          </span>
          {sport.category && (
            <span className="pegasus-tag">
              {sport.category}
            </span>
          )}
        </div>

        <h1 className="pegasus-page-title">{sport.name}</h1>

        {sport.description && (
          <p className="pegasus-page__description">{sport.description}</p>
        )}
      </section>

      <section className="pegasus-profile-section">
        <div className="pegasus-profile-section__heading">
          <p className="pegasus-eyebrow">COMPETITION SCHEDULE & FORMATS</p>
          <h2>
            Configured Events ({sportEvents.length})
          </h2>
        </div>

        {sportEvents.length === 0 ? (
          <div className="pegasus-card" style={{ textAlign: "center", padding: "48px 24px" }}>
            <p className="pegasus-eyebrow" style={{ color: "var(--muted)" }}>
              No Events Configured
            </p>
            <h3 style={{ margin: "10px 0 8px", fontSize: "20px" }}>
              Events for {sport.name} will appear here once scheduled.
            </h3>
            <p style={{ margin: 0, fontSize: "14px", color: "var(--muted)" }}>
              Check back for updated competition schedules and division assignments.
            </p>
          </div>
        ) : (
          <div className="pegasus-events-list">
            {sportEvents.map((event) => {
              const resolved = resolveFestivalEvent(event);
              const division = event.divisionId
                ? CODEX_DIVISIONS.find((d) => d.id === event.divisionId)
                : null;

              return (
                <article key={event.id} className="pegasus-event-card">
                  <div className="pegasus-event-card__header">
                    <div>
                      <h3>{event.name}</h3>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
                        <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                          {division ? `${division.name} (${division.level})` : event.category}
                        </span>
                      </div>
                    </div>

                    <div className="pegasus-event-card__tags">
                      <span className="pegasus-tag pegasus-tag--accent">
                        {event.format}
                      </span>
                      <span className="pegasus-tag">
                        {event.type}
                      </span>
                      {resolved?.classification && (
                        <span className="pegasus-tag">
                          Class {resolved.classification}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pegasus-event-card__details">
                    <div className="pegasus-event-card__detail-item">
                      <span className="pegasus-event-card__detail-label">Competition Format</span>
                      <span className="pegasus-event-card__detail-val" style={{ textTransform: "capitalize" }}>
                        {event.format.replace("_", " ")}
                      </span>
                    </div>

                    <div className="pegasus-event-card__detail-item">
                      <span className="pegasus-event-card__detail-label">Division / Level</span>
                      <span className="pegasus-event-card__detail-val">
                        {division ? division.name : event.category}
                      </span>
                    </div>

                    <div className="pegasus-event-card__detail-item">
                      <span className="pegasus-event-card__detail-label">Team Quota</span>
                      <span className="pegasus-event-card__detail-val">
                        {resolved?.quota ? (
                          <>
                            {resolved.quota.mainParticipants} athletes
                            {resolved.quota.substitutes ? ` (+${resolved.quota.substitutes} subs)` : ""}
                          </>
                        ) : (
                          "Standard entry"
                        )}
                      </span>
                    </div>

                    <div className="pegasus-event-card__detail-item">
                      <span className="pegasus-event-card__detail-label">Codex Points</span>
                      <span className="pegasus-event-card__detail-val">
                        {resolved?.pointsMatrix ? (
                          `1st: ${resolved.pointsMatrix.first} • 2nd: ${resolved.pointsMatrix.second} • 3rd: ${resolved.pointsMatrix.third}`
                        ) : (
                          <span style={{ color: "var(--muted)" }}>Unconfirmed</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {resolved?.quota?.notes && (
                    <div
                      style={{
                        padding: "10px 14px",
                        borderRadius: "8px",
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid var(--border)",
                        fontSize: "12px",
                        color: "var(--muted-strong)",
                      }}
                    >
                      <strong>Rule note:</strong> {resolved.quota.notes}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}