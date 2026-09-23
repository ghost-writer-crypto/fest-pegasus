import Link from "next/link";
import { events as staticEvents } from "@/data/events";
import {
  judgeAssignments as staticJudgeAssignments,
  getJudgeAssignments as getStaticJudgeAssignments,
  getAssignedEvents as getStaticAssignedEvents,
} from "@/lib/judging";
import {
  getActiveFestival,
  getEventsByFestival,
  getAuthenticatedProfile,
  getAssignmentsByJudge,
  getAssignedEventsForJudge,
  type EventRow,
  type JudgeAssignmentRow,
} from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function JudgeControlPage() {
  let dbEvents: EventRow[] = [];
  let festivalName = "Pegasus Sports Festival";
  let hasActiveFestival = false;
  let activeFestivalId = "";

  try {
    const activeFestival = await getActiveFestival();
    if (activeFestival) {
      hasActiveFestival = true;
      activeFestivalId = activeFestival.id;
      festivalName = activeFestival.name;
      dbEvents = await getEventsByFestival(activeFestival.id);
    }
  } catch (error) {
    console.error("[JudgeControlPage] Failed to retrieve festival events:", error);
    dbEvents = [];
  }

  // 1. Resolve server-side authenticated identity
  let authProfile = null;
  try {
    authProfile = await getAuthenticatedProfile();
  } catch (error) {
    console.error("[JudgeControlPage] Failed to resolve auth profile:", error);
  }

  // 2. Resolve official judge assignments
  let assignedEventRows: EventRow[] = [];
  let dbAssignments: JudgeAssignmentRow[] = [];

  if (authProfile && activeFestivalId) {
    try {
      [dbAssignments, assignedEventRows] = await Promise.all([
        getAssignmentsByJudge(activeFestivalId, authProfile.userId),
        getAssignedEventsForJudge(activeFestivalId, authProfile.userId),
      ]);
    } catch (err) {
      console.error("[JudgeControlPage] Failed to retrieve judge assignments:", err);
    }
  }

  // Fallback to static assignments if in non-production transitional mode
  const currentJudgeId = authProfile?.userId ?? "";
  const staticAssignments = getStaticJudgeAssignments(
    currentJudgeId,
    staticJudgeAssignments,
  );
  const staticAssignedEvents = getStaticAssignedEvents(
    currentJudgeId,
    staticJudgeAssignments,
    staticEvents,
  );

  const totalAssignedCount =
    assignedEventRows.length > 0
      ? assignedEventRows.length
      : staticAssignments.length;

  // Unified event list: prefer real database events; fallback to verified static events
  const totalEventsCount =
    dbEvents.length > 0 ? dbEvents.length : staticEvents.length;

  // Operational metrics reflecting real data
  const metrics = [
    { label: "Total Events", value: totalEventsCount },
    { label: "Assigned Events", value: totalAssignedCount },
    {
      label: "In Progress",
      value: dbAssignments.filter((a) => a.status === "in_progress").length,
    },
    {
      label: "Submitted",
      value: dbAssignments.filter((a) => a.status === "submitted").length,
    },
  ];

  return (
    <main className="pegasus-page pegasus-animate-fade">
      {/* Internal Operational Bar - strictly private, not in public navbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "10px",
          padding: "10px 16px",
          background: "rgba(255, 255, 255, 0.03)",
          borderRadius: "8px",
          border: "1px solid var(--border)",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: 750,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: authProfile ? "var(--status-live)" : "var(--status-pending)",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "currentColor",
              display: "inline-block",
            }}
          />
          {authProfile
            ? "AUTHENTICATED OFFICIAL DESK"
            : "NON-PRODUCTION TRANSITIONAL MODE"}
        </span>
        <span
          style={{
            fontSize: "11px",
            color: "var(--muted)",
            fontFamily: "monospace",
          }}
        >
          {authProfile
            ? `REFEREE: ${authProfile.fullName.toUpperCase()} • ROLE: ${authProfile.role.toUpperCase()}`
            : `STATION: FIELD-REFEREE-DESK • ${hasActiveFestival ? festivalName.toUpperCase() : "STANDALONE"}`}
        </span>
      </div>

      <section className="pegasus-page__header">
        <p className="pegasus-eyebrow">CONTROL ROOM • FIELD OPERATIONS</p>
        <h1 className="pegasus-page-title">Judge Control Center</h1>
        <p className="pegasus-page__description">
          Field operations console for referees, event judges, and official
          scorers. Enter performance marks, verify lane outcomes, and submit
          results for Chief Scorer verification.
        </p>
      </section>

      {/* Operational Metrics Grid */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "12px",
          marginBottom: "28px",
        }}
      >
        {metrics.map((m) => (
          <div
            key={m.label}
            className="pegasus-card"
            style={{
              padding: "16px 20px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {m.label}
            </span>
            <strong
              style={{
                fontSize: "28px",
                fontWeight: 900,
                lineHeight: 1,
                color: m.value > 0 ? "var(--accent)" : "var(--foreground)",
              }}
            >
              {m.value}
            </strong>
          </div>
        ))}
      </section>

      {/* Assigned Events Section */}
      {assignedEventRows.length > 0 ? (
        <section style={{ display: "grid", gap: "16px", marginBottom: "40px" }}>
          <div style={{ marginBottom: "8px" }}>
            <p className="pegasus-eyebrow">OFFICIAL ROSTER</p>
            <h2 style={{ fontSize: "18px", fontWeight: 800, margin: 0 }}>
              Your Official Event Assignments ({assignedEventRows.length})
            </h2>
          </div>

          {assignedEventRows.map((event) => (
            <article
              key={event.id}
              className="pegasus-card pegasus-card--interactive"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "16px",
                padding: "20px",
              }}
            >
              <div>
                <span className="pegasus-eyebrow">
                  {event.competition_type || "Event"}
                  {event.point_class && ` • Class ${event.point_class}`}
                </span>
                <h3
                  style={{
                    margin: "4px 0 2px",
                    fontSize: "18px",
                    fontWeight: 800,
                  }}
                >
                  {event.name}
                </h3>
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                  Code: {event.code}
                </span>
              </div>

              <Link
                href={`/judge/events/${event.id}`}
                className="pegasus-button pegasus-button--primary"
                style={{
                  minHeight: "44px",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                Open Event Desk <span>↗</span>
              </Link>
            </article>
          ))}
        </section>
      ) : staticAssignedEvents.length > 0 ? (
        <section style={{ display: "grid", gap: "16px", marginBottom: "40px" }}>
          {staticAssignedEvents.map((event) => (
            <article
              key={event.id}
              className="pegasus-card pegasus-card--interactive"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "16px",
                padding: "20px",
              }}
            >
              <div>
                <span className="pegasus-eyebrow">{event.sport}</span>
                <h3
                  style={{
                    margin: "4px 0 2px",
                    fontSize: "18px",
                    fontWeight: 800,
                  }}
                >
                  {event.name}
                </h3>
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                  {event.category} • {event.format}
                </span>
              </div>

              <Link
                href={`/judge/events/${event.id}`}
                className="pegasus-button pegasus-button--primary"
                style={{
                  minHeight: "44px",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                Open Event Desk <span>↗</span>
              </Link>
            </article>
          ))}
        </section>
      ) : (
        <section
          className="pegasus-card"
          style={{
            textAlign: "center",
            padding: "56px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid var(--border)",
              color: "var(--muted)",
              fontSize: "20px",
              marginBottom: "4px",
            }}
          >
            ⚖
          </div>
          <p
            className="pegasus-eyebrow"
            style={{ color: "var(--muted)", margin: 0 }}
          >
            OFFICIAL DESK
          </p>
          <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 800 }}>
            {authProfile
              ? "No active event assignments found"
              : "No authenticated judge session found"}
          </h2>
          <p
            style={{
              margin: "0 auto",
              maxWidth: "480px",
              fontSize: "14px",
              color: "var(--muted)",
              lineHeight: 1.6,
            }}
          >
            {authProfile
              ? `Official referee '${authProfile.fullName}' currently has no assigned competition heats. Assignments are provisioned by the Festival Technical Committee.`
              : "Referee assignments are provisioned by the Festival Technical Committee and require an authenticated referee session. You can inspect configured festival events below."}
          </p>

          <div
            style={{
              marginTop: "16px",
              padding: "14px 18px",
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              fontSize: "12px",
              color: "var(--muted)",
              maxWidth: "520px",
              textAlign: "left",
              lineHeight: 1.6,
            }}
          >
            <strong
              style={{
                color: "var(--foreground)",
                display: "block",
                marginBottom: "4px",
              }}
            >
              Official Protocol Notice:
            </strong>
            When scheduled to officiate an upcoming heat or match, check in at the
            Chief Scorer Station to confirm your official roster. Select any configured
            festival event below to inspect field score sheet layouts.
          </div>
        </section>
      )}

      {/* Field Inspection & Sheet Directory */}
      <section style={{ marginTop: "40px" }}>
        <div style={{ marginBottom: "16px" }}>
          <p className="pegasus-eyebrow">FIELD ROSTER DIRECTORY</p>
          <h2 style={{ fontSize: "18px", fontWeight: 800, margin: 0 }}>
            Configured Festival Events ({totalEventsCount})
          </h2>
          <p
            style={{
              fontSize: "13px",
              color: "var(--muted)",
              margin: "4px 0 0",
            }}
          >
            Select an event to open its score sheet, record marks, and submit results for Chief Scorer verification.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "12px",
          }}
        >
          {dbEvents.length > 0
            ? dbEvents.map((event) => (
                <div
                  key={event.id}
                  className="pegasus-card"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 18px",
                    gap: "12px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--muted)",
                        textTransform: "uppercase",
                        fontWeight: 750,
                        letterSpacing: "0.05em",
                      }}
                    >
                      {event.competition_type || "Event"}
                      {event.point_class && ` • Class ${event.point_class}`}
                    </div>
                    <strong
                      style={{
                        fontSize: "15px",
                        display: "block",
                        marginTop: "2px",
                      }}
                    >
                      {event.name}
                    </strong>
                    <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                      Code: {event.code}
                    </span>
                  </div>

                  <Link
                    href={`/judge/events/${event.id}`}
                    className="pegasus-button pegasus-button--subtle"
                    style={{
                      fontSize: "12px",
                      padding: "8px 14px",
                      minHeight: "44px",
                      display: "inline-flex",
                      alignItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    Score Sheet <span>↗</span>
                  </Link>
                </div>
              ))
            : staticEvents.map((event) => (
                <div
                  key={event.id}
                  className="pegasus-card"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 18px",
                    gap: "12px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--muted)",
                        textTransform: "uppercase",
                        fontWeight: 700,
                      }}
                    >
                      {event.sport}
                    </div>
                    <strong
                      style={{
                        fontSize: "15px",
                        display: "block",
                        marginTop: "2px",
                      }}
                    >
                      {event.name}
                    </strong>
                    <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                      {event.category} • {event.type}
                    </span>
                  </div>

                  <Link
                    href={`/judge/events/${event.id}`}
                    className="pegasus-button pegasus-button--subtle"
                    style={{
                      fontSize: "12px",
                      padding: "8px 14px",
                      minHeight: "44px",
                      display: "inline-flex",
                      alignItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    Score Sheet <span>↗</span>
                  </Link>
                </div>
              ))}
        </div>
      </section>
    </main>
  );
}
