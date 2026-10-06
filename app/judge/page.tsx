import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
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
  getOrCreateQrIdentity,
  type EventRow,
  type JudgeAssignmentRow,
} from "@/lib/repositories";
import ShowQrButton from "@/components/qr/ShowQrButton";

export const dynamic = "force-dynamic";

export default async function JudgeControlPage() {
  await requireRole(["judge", "admin"], "/judge");
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

  // Resolve on-demand QR identity for the active judge
  const judgeId = authProfile?.userId || "j001";
  const judgeName = authProfile?.fullName || "Judge One";
  const qrIdentity = await getOrCreateQrIdentity("profile", judgeId);

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
          gap: "12px",
          padding: "10px 16px",
          background: "rgba(255, 255, 255, 0.03)",
          borderRadius: "8px",
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
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

        {/* On-demand Judge QR Action */}
        <ShowQrButton
          data={{
            name: judgeName,
            role: "judge",
            roleLabel: "Official Event Judge / Referee",
            identifier: `ID: ${judgeId.startsWith("j") ? judgeId.toUpperCase() : `J-${judgeId.slice(0, 6).toUpperCase()}`}`,
            qrUrl: `/qr/${qrIdentity.qr_token}`,
            isPrivileged: true,
          }}
          label="Show Official QR"
          variant="secondary"
          style={{ fontSize: "12px", minHeight: "32px", padding: "4px 12px" }}
        />
      </div>

      <section className="pegasus-page__header" style={{ marginBottom: "28px" }}>
        <p className="zenith-kicker" style={{ marginBottom: "8px" }}>09 / FIELD REFEREE</p>
        <h1 className="pegasus-page-title" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 900, textTransform: "uppercase" }}>Judge Control Center</h1>
        <p className="pegasus-page__description">
          Field operations console for referees, event judges, and official scorers. Rapid lane mark entry, result verification, and official submission.
        </p>
      </section>

      {/* Operational Metrics Grid */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "14px",
          marginBottom: "32px",
        }}
      >
        {metrics.map((m) => (
          <div
            key={m.label}
            className="zenith-surface-1 zenith-edge"
            style={{
              padding: "16px 20px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              borderRadius: "var(--radius-medium)",
              border: "1px solid var(--border)",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 800,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontFamily: "var(--font-mono)",
              }}
            >
              {m.label}
            </span>
            <strong
              style={{
                fontSize: "28px",
                fontWeight: 900,
                lineHeight: 1,
                fontFamily: "var(--font-mono)",
                color: m.value > 0 ? "var(--primary)" : "var(--text-primary)",
              }}
            >
              {m.value}
            </strong>
          </div>
        ))}
      </section>

      {/* Assigned Matches Section */}
      {assignedEventRows.length > 0 ? (
        <section style={{ display: "grid", gap: "16px", marginBottom: "40px" }}>
          <div style={{ marginBottom: "8px" }}>
            <p className="zenith-kicker" style={{ marginBottom: "4px" }}>OFFICIAL MATCH ROSTER</p>
            <h2 style={{ fontSize: "20px", fontWeight: 850, margin: 0, textTransform: "uppercase", color: "var(--text-primary)" }}>
              ASSIGNED MATCHES ({assignedEventRows.length})
            </h2>
          </div>

          {assignedEventRows.map((event) => (
            <article
              key={event.id}
              className="zenith-surface-1 zenith-edge"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "20px",
                padding: "20px 24px",
                borderRadius: "var(--radius-medium)",
                border: "1px solid var(--border)",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span className="zenith-kicker">
                    {event.competition_type || "ATHLETICS"}
                  </span>
                  <span style={{ color: "var(--border)" }}>•</span>
                  <span className="zenith-signal zenith-signal-upcoming">
                    <span className="zenith-signal-dot" />
                    ASSIGNED // READY FOR SCORING
                  </span>
                </div>

                <h3
                  style={{
                    margin: "2px 0 6px",
                    fontSize: "20px",
                    fontWeight: 850,
                    textTransform: "uppercase",
                    color: "var(--text-primary)",
                  }}
                >
                  {event.name}
                </h3>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    flexWrap: "wrap",
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  <span>TEAMS: All Qualified Houses</span>
                  <span>•</span>
                  <span>VENUE: Main Track // Lane 1-8</span>
                  <span>•</span>
                  <span>SESSION: Primary Draw</span>
                </div>
              </div>

              <Link
                href={`/judge/events/${event.id}`}
                className="zenith-btn zenith-btn-primary"
                style={{
                  minHeight: "44px",
                  display: "inline-flex",
                  alignItems: "center",
                  fontSize: "13px",
                  padding: "0 20px",
                }}
              >
                OPEN MATCH <span>→</span>
              </Link>
            </article>
          ))}
        </section>
      ) : staticAssignedEvents.length > 0 ? (
        <section style={{ display: "grid", gap: "16px", marginBottom: "40px" }}>
          <div style={{ marginBottom: "8px" }}>
            <p className="pegasus-eyebrow">OFFICIAL MATCH ROSTER</p>
            <h2 style={{ fontSize: "20px", fontWeight: 850, margin: 0 }}>
              ASSIGNED MATCHES ({staticAssignedEvents.length})
            </h2>
          </div>

          {staticAssignedEvents.map((event) => (
            <article
              key={event.id}
              className="pegasus-card pegasus-card--interactive"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "20px",
                padding: "20px 24px",
                border: "1px solid var(--border)",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span className="font-mono text-xs font-bold text-[#5B9BD5] uppercase tracking-wider">
                    {event.sport.toUpperCase()}
                  </span>
                  <span style={{ color: "var(--muted)" }}>•</span>
                  <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase bg-[#1A3663] text-white rounded-xs">
                    ASSIGNED // READY FOR SCORING
                  </span>
                </div>

                <h3
                  style={{
                    margin: "2px 0 6px",
                    fontSize: "20px",
                    fontWeight: 800,
                    color: "var(--foreground)",
                  }}
                >
                  {event.name}
                </h3>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    flexWrap: "wrap",
                    fontSize: "12px",
                    color: "var(--muted)",
                    fontFamily: "monospace",
                  }}
                >
                  <span>TEAMS/PARTICIPANTS: {event.category}</span>
                  <span>•</span>
                  <span>VENUE: Main Stadium</span>
                  <span>•</span>
                  <span>TIME: Scheduled Session</span>
                </div>
              </div>

              <Link
                href={`/judge/events/${event.id}`}
                className="pegasus-button pegasus-button--primary"
                style={{
                  minHeight: "44px",
                  display: "inline-flex",
                  alignItems: "center",
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                }}
              >
                OPEN MATCH <span>→</span>
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
