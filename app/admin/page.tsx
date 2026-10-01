import Link from "next/link";
import { getAdminDashboardData } from "@/lib/admin";
import { getAuthenticatedProfile, getOrCreateQrIdentity } from "@/lib/repositories";
import ShowQrButton from "@/components/qr/ShowQrButton";
import AdminHeroMediaClient from "@/components/admin/AdminHeroMediaClient";

export const dynamic = "force-dynamic";

export default async function AdminCommandCenterPage() {
  const data = await getAdminDashboardData();
  const profile = await getAuthenticatedProfile();
  const adminId = profile?.userId || "a001";
  const adminName = profile?.fullName || "Super Admin";
  const qrIdentity = await getOrCreateQrIdentity("profile", adminId);

  const totalAttentionCount = data.attentionItems.reduce(
    (sum, item) => sum + item.count,
    0,
  );

  return (
    <div
      className="pegasus-animate-fade"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "32px",
        maxWidth: "100%",
      }}
    >
      {/* 1. Cockpit Header & Operational Status */}
      <section>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div>
            <p className="zenith-kicker" style={{ margin: "0 0 6px" }}>
              00 // OPERATIONAL TELEMETRY
            </p>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(26px, 4vw, 36px)",
                fontWeight: 900,
                letterSpacing: "-0.03em",
                textTransform: "uppercase",
                color: "var(--text-primary)",
              }}
            >
              ZENITHROW COMMAND
            </h1>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: "13px",
                color: "var(--muted)",
                maxWidth: "680px",
                lineHeight: 1.5,
              }}
            >
              Live operational telemetry for {data.festivalName}. Monitor referee
              submissions, verify results, track live events, and release outcomes.
            </p>
          </div>

          {/* Actions & Active Station Status */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <ShowQrButton
              data={{
                name: adminName,
                role: "admin",
                roleLabel: "Festival Administrator",
                identifier: `ID: ${adminId.startsWith("a") ? adminId.toUpperCase() : `A-${adminId.slice(0, 6).toUpperCase()}`}`,
                qrUrl: `/qr/${qrIdentity.qr_token}`,
                isPrivileged: true,
              }}
              label="Show Admin QR"
              variant="primary"
            />

            <div
              className="pegasus-card"
              style={{
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                background: "var(--surface)",
                minWidth: "160px",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: data.festivalStatus.isActive
                    ? "var(--status-live)"
                    : "var(--muted)",
                  display: "inline-block",
                  boxShadow: data.festivalStatus.isActive
                    ? "0 0 8px var(--status-live)"
                    : "none",
                }}
              />
              <div>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--muted)",
                    display: "block",
                  }}
                >
                  STATION STATUS
                </span>
                <strong style={{ fontSize: "13px", color: "var(--foreground)" }}>
                  {data.festivalStatus.label}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Pillar Operational Cockpit */}
      <section>
        <div style={{ marginBottom: "12px" }}>
          <p className="pegasus-eyebrow" style={{ margin: 0 }}>OPERATIONAL TRIAGE</p>
          <h2 style={{ fontSize: "18px", fontWeight: 850, margin: "2px 0 0" }}>
            4-PILLAR FESTIVAL STATUS
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "14px" }}>
          {/* Pillar 1: WHAT IS HAPPENING */}
          <div className="pegasus-card" style={{ padding: "18px 20px", borderLeft: "4px solid #5B9BD5" }}>
            <span className="font-mono text-[11px] font-bold text-[#5B9BD5] uppercase tracking-wider block">
              01 // WHAT IS HAPPENING
            </span>
            <strong className="text-xl font-black text-[#1A3663] block mt-1">
              {data.events.liveEvents > 0 ? `${data.events.liveEvents} Heats In Progress` : "Standby Session Active"}
            </strong>
            <p className="text-xs text-muted-foreground mt-1">
              Arena status: Electronic timing armed. Track 01, Field Mat, Turf active.
            </p>
            <Link href="/admin/live" className="text-xs font-mono font-bold text-[#5B9BD5] inline-flex items-center gap-1 mt-3">
              Monitor Live Arena <span>↗</span>
            </Link>
          </div>

          {/* Pillar 2: WHAT NEEDS ACTION */}
          <div className="pegasus-card" style={{ padding: "18px 20px", borderLeft: "4px solid #E53737" }}>
            <span className="font-mono text-[11px] font-bold text-[#E53737] uppercase tracking-wider block">
              02 // WHAT NEEDS ACTION
            </span>
            <strong className="text-xl font-black text-[#E53737] block mt-1">
              {totalAttentionCount > 0 ? `${totalAttentionCount} Items Requiring Decision` : "0 Pending Actions"}
            </strong>
            <p className="text-xs text-muted-foreground mt-1">
              Verification queue: {data.results.submittedResults} submitted scorecards, {totalAttentionCount} critical attention queues.
            </p>
            <Link href="/admin/verification" className="text-xs font-mono font-bold text-[#E53737] inline-flex items-center gap-1 mt-3">
              Review Verification Queue <span>↗</span>
            </Link>
          </div>

          {/* Pillar 3: WHAT IS WAITING */}
          <div className="pegasus-card" style={{ padding: "18px 20px", borderLeft: "4px solid #F2B84B" }}>
            <span className="font-mono text-[11px] font-bold text-[#b07d1d] uppercase tracking-wider block">
              03 // WHAT IS WAITING
            </span>
            <strong className="text-xl font-black text-[#1A3663] block mt-1">
              {data.events.scheduledEvents} Events Scheduled
            </strong>
            <p className="text-xs text-muted-foreground mt-1">
              Next scheduled: Tug of War 600kg weigh-in, afternoon track heats, and football knockouts.
            </p>
            <Link href="/admin/schedule" className="text-xs font-mono font-bold text-[#b07d1d] inline-flex items-center gap-1 mt-3">
              Inspect Timetable <span>↗</span>
            </Link>
          </div>

          {/* Pillar 4: WHAT HAS BEEN PUBLISHED */}
          <div className="pegasus-card" style={{ padding: "18px 20px", borderLeft: "4px solid #1A3663" }}>
            <span className="font-mono text-[11px] font-bold text-[#1A3663] uppercase tracking-wider block">
              04 // WHAT HAS BEEN PUBLISHED
            </span>
            <strong className="text-xl font-black text-[#1A3663] block mt-1">
              {data.results.publishedResults} Official Results Live
            </strong>
            <p className="text-xs text-muted-foreground mt-1">
              Authoritative points synced to public House Shield radar and athlete achievement desks.
            </p>
            <Link href="/admin/publish" className="text-xs font-mono font-bold text-[#1A3663] inline-flex items-center gap-1 mt-3">
              View Published Results <span>↗</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Primary Metrics Bar */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "12px",
        }}
      >
        {/* Total Events */}
        <div
          className="pegasus-card"
          style={{
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <span className="pegasus-eyebrow" style={{ margin: 0 }}>
            EVENTS
          </span>
          <strong style={{ fontSize: "26px", fontWeight: 900, lineHeight: 1.1 }}>
            {data.events.totalEvents}
          </strong>
          <span style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
            {data.events.scheduledEvents} active
          </span>
        </div>

        {/* Live Operations */}
        <div
          className="pegasus-card"
          style={{
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <span
            className="pegasus-eyebrow"
            style={{ margin: 0, color: data.events.liveEvents > 0 ? "var(--status-live)" : "inherit" }}
          >
            LIVE NOW
          </span>
          <strong
            style={{
              fontSize: "26px",
              fontWeight: 900,
              lineHeight: 1.1,
              color: data.events.liveEvents > 0 ? "var(--status-live)" : "inherit",
            }}
          >
            {data.events.liveEvents}
          </strong>
          <span style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
            Track & court Heats
          </span>
        </div>

        {/* Submitted Results (Verification Queue) */}
        <div
          className="pegasus-card"
          style={{
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <span
            className="pegasus-eyebrow"
            style={{ margin: 0, color: data.results.submittedResults > 0 ? "var(--status-pending)" : "inherit" }}
          >
            SUBMITTED
          </span>
          <strong
            style={{
              fontSize: "26px",
              fontWeight: 900,
              lineHeight: 1.1,
              color: data.results.submittedResults > 0 ? "var(--status-pending)" : "inherit",
            }}
          >
            {data.results.submittedResults}
          </strong>
          <span style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
            Requires verification
          </span>
        </div>

        {/* Verified Results (Publishing Surface) */}
        <div
          className="pegasus-card"
          style={{
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <span
            className="pegasus-eyebrow"
            style={{ margin: 0, color: data.results.verifiedResults > 0 ? "var(--accent)" : "inherit" }}
          >
            VERIFIED
          </span>
          <strong
            style={{
              fontSize: "26px",
              fontWeight: 900,
              lineHeight: 1.1,
              color: data.results.verifiedResults > 0 ? "var(--accent)" : "inherit",
            }}
          >
            {data.results.verifiedResults}
          </strong>
          <span style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
            Ready for release
          </span>
        </div>

        {/* Published Results (Live) */}
        <div
          className="pegasus-card"
          style={{
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <span className="pegasus-eyebrow" style={{ margin: 0 }}>
            PUBLISHED
          </span>
          <strong style={{ fontSize: "26px", fontWeight: 900, lineHeight: 1.1 }}>
            {data.results.publishedResults}
          </strong>
          <span style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
            On public standings
          </span>
        </div>

        {/* Attention Items Total */}
        <div
          className="pegasus-card"
          style={{
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            background:
              totalAttentionCount > 0
                ? "rgba(255, 80, 80, 0.04)"
                : "rgba(215, 255, 63, 0.04)",
            border:
              totalAttentionCount > 0
                ? "1px solid rgba(255, 80, 80, 0.2)"
                : "1px solid rgba(215, 255, 63, 0.2)",
          }}
        >
          <span
            className="pegasus-eyebrow"
            style={{
              margin: 0,
              color: totalAttentionCount > 0 ? "var(--status-dns)" : "var(--accent)",
            }}
          >
            ATTENTION
          </span>
          <strong
            style={{
              fontSize: "26px",
              fontWeight: 900,
              lineHeight: 1.1,
              color: totalAttentionCount > 0 ? "var(--status-dns)" : "var(--accent)",
            }}
          >
            {totalAttentionCount}
          </strong>
          <span style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
            {totalAttentionCount > 0 ? "Actions required" : "Queues clear"}
          </span>
        </div>
      </section>

      {/* 3. Needs Attention Queue (Top Operational Priority) */}
      <section>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 800, margin: 0 }}>
              Needs Attention
            </h2>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>
              Critical queues and anomalies requiring administrative action
            </span>
          </div>

          {data.attentionItems.length > 0 && (
            <span
              className="pegasus-status pegasus-status--pending"
              style={{ fontSize: "11px", padding: "3px 8px" }}
            >
              <span className="pegasus-status__dot" />
              {data.attentionItems.length} Queue Item{data.attentionItems.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {data.attentionItems.length === 0 ? (
          <div
            className="pegasus-card"
            style={{
              padding: "24px 28px",
              background: "rgba(215, 255, 63, 0.02)",
              border: "1px solid rgba(215, 255, 63, 0.15)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: "var(--accent)",
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              <div>
                <strong style={{ fontSize: "15px", display: "block" }}>
                  Verification & Publication Queues Clear
                </strong>
                <span style={{ fontSize: "13px", color: "var(--muted)" }}>
                  No pending referee submissions awaiting verification, no unreleased verified results, and zero schedule clashes.
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <Link
                href="/admin/verification"
                className="pegasus-button pegasus-button--subtle"
                style={{ fontSize: "12px", minHeight: "34px", padding: "0 12px" }}
              >
                Verification Queue ↗
              </Link>
              <Link
                href="/admin/publish"
                className="pegasus-button pegasus-button--subtle"
                style={{ fontSize: "12px", minHeight: "34px", padding: "0 12px" }}
              >
                Publishing Desk ↗
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "10px" }}>
            {data.attentionItems.map((item) => (
              <div
                key={item.id}
                className="pegasus-card"
                style={{
                  padding: "16px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "16px",
                  borderLeft:
                    item.severity === "urgent"
                      ? "3px solid var(--status-dns)"
                      : "3px solid var(--status-pending)",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      color:
                        item.severity === "urgent"
                          ? "var(--status-dns)"
                          : "var(--status-pending)",
                      letterSpacing: "0.06em",
                      display: "block",
                      marginBottom: "2px",
                    }}
                  >
                    Priority {item.priority} • {item.category.toUpperCase()}
                  </span>
                  <strong style={{ fontSize: "15px", display: "block" }}>
                    {item.title}
                  </strong>
                  <p style={{ margin: "2px 0 0", fontSize: "13px", color: "var(--muted)" }}>
                    {item.description}
                  </p>
                </div>

                <Link
                  href={item.href}
                  className="pegasus-button pegasus-button--primary"
                  style={{ minHeight: "36px", fontSize: "12px", padding: "0 14px", flexShrink: 0 }}
                >
                  {item.actionLabel} <span>→</span>
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. Live Now & Upcoming Two-Column Section */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "20px",
        }}
      >
        {/* Live Operations */}
        <div
          className="pegasus-card"
          style={{
            padding: "22px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="pegasus-eyebrow" style={{ margin: 0, color: "var(--status-live)" }}>
              FIELD TELEMETRY
            </span>
            <span
              className={`pegasus-status ${
                data.liveOperations.length > 0
                  ? "pegasus-status--live"
                  : "pegasus-status--upcoming"
              }`}
              style={{ fontSize: "10px", padding: "2px 8px" }}
            >
              <span className="pegasus-status__dot" />
              {data.liveOperations.length > 0 ? "Active Heats" : "No Live Action"}
            </span>
          </div>

          <h3 style={{ fontSize: "17px", fontWeight: 800, margin: 0 }}>
            Live Now ({data.liveOperations.length})
          </h3>

          {data.liveOperations.length === 0 ? (
            <div
              style={{
                padding: "28px 20px",
                textAlign: "center",
                color: "var(--muted)",
                fontSize: "13px",
                background: "rgba(255, 255, 255, 0.02)",
                borderRadius: "6px",
                border: "1px dashed var(--border)",
              }}
            >
              Nothing live right now. Next scheduled events are queued below.
            </div>
          ) : (
            <div style={{ display: "grid", gap: "10px" }}>
              {data.liveOperations.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: "12px 14px",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: "14px", display: "block" }}>
                      {item.eventName}
                    </strong>
                    <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                      {item.venueName} • {item.sportName}
                    </span>
                  </div>

                  <span
                    className="pegasus-status pegasus-status--live"
                    style={{ fontSize: "10px", padding: "2px 6px" }}
                  >
                    <span className="pegasus-status__dot" />
                    LIVE
                  </span>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: "auto", paddingTop: "6px" }}>
            <Link
              href="/admin/live"
              className="pegasus-button pegasus-button--subtle"
              style={{ fontSize: "12px", minHeight: "32px", padding: "0 10px" }}
            >
              Open Live Console ↗
            </Link>
          </div>
        </div>

        {/* Upcoming Operations */}
        <div
          className="pegasus-card"
          style={{
            padding: "22px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="pegasus-eyebrow" style={{ margin: 0 }}>
              TIMETABLE SCHEDULE
            </span>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>
              Chronological Queue
            </span>
          </div>

          <h3 style={{ fontSize: "17px", fontWeight: 800, margin: 0 }}>
            Upcoming Schedule ({data.upcomingOperations.length})
          </h3>

          {data.upcomingOperations.length === 0 ? (
            <div
              style={{
                padding: "28px 20px",
                textAlign: "center",
                color: "var(--muted)",
                fontSize: "13px",
                background: "rgba(255, 255, 255, 0.02)",
                borderRadius: "6px",
                border: "1px dashed var(--border)",
              }}
            >
              No upcoming scheduled events found in festival timetable.
            </div>
          ) : (
            <div style={{ display: "grid", gap: "10px" }}>
              {data.upcomingOperations.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: "10px 14px",
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: "13px", display: "block" }}>
                      {item.eventName}
                    </strong>
                    <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                      {item.venueName} • {item.sportName}
                    </span>
                  </div>

                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: "11px",
                      color: "var(--accent)",
                      background: "rgba(215, 255, 63, 0.08)",
                      padding: "3px 6px",
                      borderRadius: "4px",
                    }}
                  >
                    {new Date(item.startsAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: "auto", paddingTop: "6px" }}>
            <Link
              href="/admin/schedule"
              className="pegasus-button pegasus-button--subtle"
              style={{ fontSize: "12px", minHeight: "32px", padding: "0 10px" }}
            >
              Inspect Schedule Grid ↗
            </Link>
          </div>
        </div>
      </section>

      {/* 5. Recent Activity (Audit Log Feed) */}
      <section>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 800, margin: 0 }}>
              Recent Audit Activity
            </h2>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>
              Chronological ledger of result lifecycle events and administrator actions
            </span>
          </div>

          <Link
            href="/admin/results"
            className="pegasus-button pegasus-button--subtle"
            style={{ fontSize: "12px", minHeight: "32px", padding: "0 10px" }}
          >
            Master Results Ledger ↗
          </Link>
        </div>

        {data.recentActivities.length === 0 ? (
          <div
            className="pegasus-card"
            style={{
              padding: "32px 24px",
              textAlign: "center",
              color: "var(--muted)",
              fontSize: "13px",
            }}
          >
            No recent result mutations or audit logs recorded yet.
          </div>
        ) : (
          <div
            className="pegasus-card"
            style={{
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {data.recentActivities.slice(0, 8).map((activity) => (
              <div
                key={activity.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  borderBottom: "1px solid var(--border)",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <span
                    className={`pegasus-status ${activity.statusBadgeClass}`}
                    style={{ fontSize: "10px", padding: "2px 6px" }}
                  >
                    {activity.actionLabel}
                  </span>

                  <div>
                    <strong style={{ fontSize: "13px" }}>
                      {activity.eventSummary}
                    </strong>
                    {activity.competitorSummary && (
                      <span style={{ fontSize: "12px", color: "var(--muted)", marginLeft: "6px" }}>
                        ({activity.competitorSummary})
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  {activity.reason && (
                    <span
                      style={{
                        fontSize: "11px",
                        color: "var(--muted)",
                        maxWidth: "280px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={activity.reason}
                    >
                      {activity.reason}
                    </span>
                  )}

                  <span
                    style={{
                      fontSize: "11px",
                      fontFamily: "monospace",
                      color: "var(--muted)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {activity.relativeTime}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 6. Homepage Hero Carousel Media Staging */}
      <AdminHeroMediaClient />

      {/* 7. Quick Access Navigation Grid */}
      <section>
        <div style={{ marginBottom: "12px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 800, margin: 0 }}>
            Operational Control Surfaces
          </h2>
          <span style={{ fontSize: "12px", color: "var(--muted)" }}>
            Direct shortcuts to active administrative modules and registries
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "10px",
          }}
        >
          {[
            { label: "Verification Queue", href: "/admin/verification", desc: "Chief Scorer sign-off" },
            { label: "Publishing Desk", href: "/admin/publish", desc: "Release verified results" },
            { label: "Master Ledger", href: "/admin/results", desc: "Full performance records" },
            { label: "Athlete Registry", href: "/admin/participants", desc: `${data.general.participantCount} registered` },
            { label: "Team Squads", href: "/admin/teams", desc: `${data.general.teamCount} teams` },
            { label: "Timetable Schedule", href: "/admin/schedule", desc: `${data.general.scheduleCount} slots` },
            { label: "Match Fixtures", href: "/admin/fixtures", desc: `${data.general.fixtureCount} matches` },
            { label: "Field Operations", href: "/judge", desc: "Referee console" },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="pegasus-card pegasus-card--interactive"
              style={{
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                gap: "3px",
                textDecoration: "none",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ fontSize: "13px", color: "var(--foreground)" }}>
                  {action.label}
                </strong>
                <span style={{ color: "var(--accent)", fontSize: "12px" }}>↗</span>
              </div>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                {action.desc}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
