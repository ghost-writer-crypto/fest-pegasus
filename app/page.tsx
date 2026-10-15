import Link from "next/link";
import StaircaseIntro from "@/components/ui/StaircaseIntro";
import HsuHeroSlider from "@/components/home/HsuHeroSlider";
import Skiper103 from "@/components/ui/skiper-ui/skiper103";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import { sports as staticSports } from "@/data/sports";
import {
  getActiveFestival,
  getSchedulesByFestival,
  getVenuesByFestival,
  getEventsByFestival,
  getSportsByFestival,
  type ScheduleRow,
  type VenueRow,
  type EventRow,
  type SportRow,
} from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let schedules: ScheduleRow[] = [];
  let venues: VenueRow[] = [];
  let events: EventRow[] = [];
  let dbSports: SportRow[] = [];

  try {
    const festival = await getActiveFestival();
    if (festival) {
      [schedules, venues, events, dbSports] = await Promise.all([
        getSchedulesByFestival(festival.id),
        getVenuesByFestival(festival.id),
        getEventsByFestival(festival.id),
        getSportsByFestival(festival.id),
      ]);
    }
  } catch (error) {
    console.error("[HomePage] Error retrieving live schedule data:", error);
    schedules = [];
    venues = [];
    events = [];
    dbSports = [];
  }

  const venueMap = new Map(venues.map((v) => [v.id, v.name]));
  const eventMap = new Map(events.map((e) => [e.id, e]));

  // Prioritize active and upcoming schedules: live first, then upcoming chronologically
  const activeSchedules = schedules.filter((s) => s.status !== "cancelled");
  const sortedUpcoming = [...activeSchedules].sort((a, b) => {
    if (a.status === "live" && b.status !== "live") return -1;
    if (b.status === "live" && a.status !== "live") return 1;
    const timeA = a.starts_at ? new Date(a.starts_at).getTime() : Infinity;
    const timeB = b.starts_at ? new Date(b.starts_at).getTime() : Infinity;
    return timeA - timeB;
  });

  // Dynamically formatted upcoming programmes from official database schedules
  const scheduledProgrammes = sortedUpcoming.slice(0, 6).map((sch) => {
    const linkedEvent = sch.event_id ? eventMap.get(sch.event_id) : undefined;
    const venueName = sch.venue_id
      ? venueMap.get(sch.venue_id) || "Campus Arena"
      : "Campus Arena";

    let timeString = "TBA";
    if (sch.starts_at) {
      try {
        const d = new Date(sch.starts_at);
        if (!isNaN(d.getTime())) {
          timeString = d.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
        }
      } catch {
        timeString = "TBA";
      }
    }

    const statusDisplay =
      sch.status === "finished"
        ? "Done"
        : sch.status === "live"
        ? "Live"
        : sch.status === "delayed"
        ? "Delayed"
        : sch.status === "postponed"
        ? "Postponed"
        : "Scheduled";

    return {
      id: sch.id,
      eventName: sch.title || linkedEvent?.name || "Official Programme",
      sportName: linkedEvent?.competition_type || "Athletics",
      category: sch.category || (linkedEvent?.point_class ? `Class ${linkedEvent.point_class}` : "Championship"),
      venueName,
      timeSlot: timeString,
      status: statusDisplay,
    };
  });

  const sportsList = dbSports.length > 0 ? dbSports : staticSports;

  return (
    <div style={{ background: "var(--hsu-bg)", color: "var(--hsu-text)", minHeight: "100vh" }}>
      {/* 1. Cinematic Preloader */}
      <StaircaseIntro />

      {/* 2. Committee Hero Carousel */}
      <HsuHeroSlider />

      {/* 3. Festival stats — single high-impact metric row */}
      <Reveal as="section" className="section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="kicker">The festival</div>
              <h2>Everything<br />in one place.</h2>
            </div>
            <p className="sub">
              Follow every discipline, fixture, result and house from one home built for the whole HSU community.
            </p>
          </div>

          <div className="statrow">
            <div className="stat">
              <div className="num">{String(sportsList.length).padStart(2, "0")}</div>
              <div className="label">Disciplines</div>
            </div>
            <div className="stat">
              <div className="num">04</div>
              <div className="label">Championship Houses</div>
            </div>
            <div className="stat">
              <div className="num">{String(schedules.length).padStart(2, "0")}</div>
              <div className="label">Scheduled Programmes</div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* 4. Editorial Band Dark — Exploration navigation links */}
      <Reveal as="section" className="editorial-band dark">
        <div className="wrap">
          <div className="section-head">
            <div>
              <h2>Everything<br />moves here.</h2>
            </div>
            <Link href="/schedules" className="btn primary">
              Open schedule →
            </Link>
          </div>

          <Link href="/sports" className="mega-link">
            <strong>Sports</strong>
            <span>Explore disciplines ↗</span>
          </Link>
          <Link href="/results" className="mega-link">
            <strong>Results</strong>
            <span>Verified scores ↗</span>
          </Link>
          <Link href="/leaderboard" className="mega-link">
            <strong>Leaderboard</strong>
            <span>House championship ↗</span>
          </Link>
          <Link href="/teams" className="mega-link">
            <strong>Teams</strong>
            <span>House rosters ↗</span>
          </Link>
        </div>
      </Reveal>

      {/* 5. Enter the Arena — Complete Festival Disciplines */}
      <Reveal as="section" className="section alt">
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="kicker">Complete Programme</div>
              <h2>Pick your<br />discipline.</h2>
            </div>
            <Link href="/sports" className="btn">
              All disciplines →
            </Link>
          </div>

          <div className="grid grid4">
            {sportsList.slice(0, 8).map((sport: any, idx: number) => {
              const num = String(idx + 1).padStart(2, "0");
              return (
                <Link
                  key={sport.id}
                  href={`/sports/${sport.slug || sport.id}`}
                  className="card sport"
                  style={{
                    background: "linear-gradient(145deg, rgba(25, 25, 28, 0.95), rgba(12, 12, 14, 0.98))",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: "180px",
                    padding: "24px 20px",
                    borderRadius: "16px",
                    textDecoration: "none",
                    position: "relative",
                    overflow: "hidden",
                    transition: "border-color 0.2s ease, transform 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="tag" style={{ margin: 0 }}>{num} · {sport.category || "General"}</span>
                    {sport.pointClass && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 800,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: "rgba(255, 255, 255, 0.06)",
                          color: "var(--muted)",
                        }}
                      >
                        Tier {sport.pointClass}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 style={{ margin: "16px 0 6px", fontSize: "19px", fontWeight: 800, color: "#fff" }}>
                      {sport.name}
                    </h3>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--muted)", lineHeight: 1.4 }}>
                      {sport.venueName || "Campus Arena"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </Reveal>

      {/* 6. Upcoming Programme Table */}
      <Reveal as="section" className="section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="kicker">Official Timetable</div>
              <h2>Upcoming schedule.</h2>
            </div>
            <Link href="/schedules" className="btn">
              Full schedule →
            </Link>
          </div>

          <div className="table">
            <div className="tr th">
              <span>Time</span>
              <span>Programme</span>
              <span>Venue</span>
              <span>Status</span>
            </div>

            {scheduledProgrammes.length === 0 ? (
              <div
                className="tr"
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "24px",
                  color: "var(--text-muted)",
                  textAlign: "center",
                }}
              >
                <span>Official timetable entries will appear once published by the technical committee.</span>
              </div>
            ) : (
              scheduledProgrammes.map((item) => (
                <div key={item.id} className="tr">
                  <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{item.timeSlot}</span>
                  <span>
                    <b>{item.eventName}</b>
                    <small style={{ display: "block", color: "var(--text-muted)" }}>
                      {item.sportName} · {item.category}
                    </small>
                  </span>
                  <span>{item.venueName}</span>
                  <span
                    className={`status ${
                      item.status === "Live"
                        ? "live"
                        : item.status === "Done"
                        ? "done"
                        : ""
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </Reveal>

      {/* 7. Tournament Regulations & Directives Accordion */}
      <Skiper103 />

      {/* 8. Split Feature Band — Authentic Campus Photography */}
      <Reveal as="section" className="editorial-band light">
        <div className="wrap">
          <div className="split-feature">
            <div
              className="media"
              style={{
                backgroundImage: "url('/images/hero/zenithrow-arena-aerial.jpg')",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
              role="img"
              aria-label="Hamdan Annual Sports Carnival official arena aerial view"
            />
            <div className="copy">
              <div>
                <div className="kicker">HSU · ZENITHROW 2026</div>
                <h2 className="editorial-title">Built for<br />the campus.</h2>
              </div>
              <p className="sub">
                From the opening ceremony to the final championship table, the official Hamdan fest experience stays clear, fast and connected.
              </p>
              <Link href="/my-result" className="btn primary" style={{ alignSelf: "flex-start" }}>
                Open My ZENITHROW →
              </Link>
            </div>
          </div>
        </div>
      </Reveal>

      {/* 9. Committee Shared Footer */}
      <Footer />
    </div>
  );
}