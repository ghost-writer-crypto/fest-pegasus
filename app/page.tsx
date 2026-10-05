import Link from "next/link";
import StaircaseIntro from "@/components/ui/StaircaseIntro";
import HsuHeroSlider from "@/components/home/HsuHeroSlider";
import HsuLiveTicker from "@/components/home/HsuLiveTicker";
import Skiper103 from "@/components/ui/skiper-ui/skiper103";
import Footer from "@/components/Footer";
import { sports } from "@/data/sports";
import { events } from "@/data/events";
import { competitions } from "@/data/competitions";
import { venues } from "@/data/venues";
import { results } from "@/data/results";

export default function HomePage() {
  // Format performance display safely
  const formatPerformance = (perf?: (typeof results)[0]["performance"]): string => {
    if (!perf) return "Official Finish";
    if (typeof perf === "string") return perf;
    if (perf.raw) return perf.raw;
    if (perf.timeMs !== undefined) return `${(perf.timeMs / 1000).toFixed(2)}s`;
    if (perf.distanceM !== undefined) return `${perf.distanceM}m`;
    if (perf.heightM !== undefined) return `${perf.heightM}m`;
    if (perf.score !== undefined) return `${perf.score} pts`;
    return "Official Finish";
  };

  // Real verified competition schedule/scoreboard
  const scheduledProgrammes = competitions.slice(0, 5).map((comp) => {
    const event = events.find((e) => e.id === comp.eventId);
    const venue = venues.find((v) => v.id === comp.venueId) || {
      name:
        comp.venueId === "main-track"
          ? "Main Track"
          : comp.venueId === "long-jump-pit"
          ? "Long Jump Pit"
          : "Stadium",
      location: "Main Campus",
    };
    const topResult = results.find(
      (r) => r.competitionId === comp.id && r.position === 1
    );

    const timeString = comp.scheduledAt
      ? new Date(comp.scheduledAt).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : "10:00";

    return {
      id: comp.id,
      eventName: event?.name || "Track & Field Event",
      sportName: event?.sport || "Athletics",
      category: event?.category || "Championship",
      venueName: venue.name,
      timeSlot: timeString,
      performance: formatPerformance(topResult?.performance),
      status: comp.status === "live" ? "Live" : comp.status === "completed" ? "Done" : "Soon",
    };
  });

  return (
    <div style={{ background: "var(--hsu-bg)", color: "var(--hsu-text)", minHeight: "100vh" }}>
      {/* 1. Cinematic Preloader */}
      <StaircaseIntro />

      {/* 2. Committee Hero Carousel */}
      <HsuHeroSlider />

      {/* 3. Live Telemetry Ticker */}
      <HsuLiveTicker />

      {/* 4. The festival, at a glance (Stat Row) */}
      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="kicker">The festival, at a glance</div>
              <h2>Everything<br />in one place.</h2>
            </div>
            <p className="sub">
              A front-end built like a modern festival platform: visual enough to feel alive,
              structured enough to find what you need in seconds.
            </p>
          </div>

          <div className="statrow">
            <div className="stat">
              <div className="num">{String(sports.length).padStart(2, "0")}</div>
              <div className="label">Sports</div>
            </div>
            <div className="stat">
              <div className="num" style={{ color: "var(--hsu-red)" }}>LIVE</div>
              <div className="label">Status</div>
            </div>
            <div className="stat">
              <div className="num">24/7</div>
              <div className="label">Updates</div>
            </div>
            <div className="stat">
              <div className="num">01</div>
              <div className="label">Championship</div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Editorial Band Light (Metric Strip) */}
      <section className="editorial-band light">
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="kicker">The festival</div>
              <h2>One campus.<br />Many ways to compete.</h2>
            </div>
            <p className="sub">
              Follow every discipline, fixture, result and house from one visual home built
              for the whole HSU community.
            </p>
          </div>

          <div className="metric-strip">
            <div className="metric">
              <b>{String(sports.length).padStart(2, "0")}</b>
              <small>Sports</small>
            </div>
            <div className="metric">
              <b style={{ color: "var(--hsu-red)" }}>LIVE</b>
              <small>Festival status</small>
            </div>
            <div className="metric">
              <b>01</b>
              <small>Championship</small>
            </div>
            <div className="metric">
              <b>∞</b>
              <small>Moments</small>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Editorial Band Dark (Mega Links) */}
      <section className="editorial-band dark">
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="kicker">Explore</div>
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
          <Link href="/display" className="mega-link">
            <strong>Live</strong>
            <span>Follow the action ↗</span>
          </Link>
          <Link href="/results" className="mega-link">
            <strong>Results</strong>
            <span>Verified scores ↗</span>
          </Link>
          <Link href="/leaderboard" className="mega-link">
            <strong>Leaderboard</strong>
            <span>House championship ↗</span>
          </Link>
        </div>
      </section>

      {/* 7. Enter the Arena (Sports Grid) */}
      <section className="section alt">
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="kicker">Enter the arena</div>
              <h2>Pick your<br />game.</h2>
            </div>
            <Link href="/sports" className="btn">
              All sports →
            </Link>
          </div>

          <div className="grid grid4">
            <Link
              href="/sports/athletics"
              className="card sport"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=900&q=80')",
              }}
            >
              <span className="tag">01 • Track</span>
              <h3>Athletics</h3>
            </Link>
            <Link
              href="/sports/football"
              className="card sport"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=900&q=80')",
              }}
            >
              <span className="tag">02 • Field</span>
              <h3>Football</h3>
            </Link>
            <Link
              href="/sports/tug-of-war"
              className="card sport"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1526676037777-05a232554f77?auto=format&fit=crop&w=900&q=80')",
              }}
            >
              <span className="tag">03 • Arena</span>
              <h3>Tug of War</h3>
            </Link>
            <Link
              href="/sports/volleyball"
              className="card sport"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1592656670411-0b1b3f8d0b88?auto=format&fit=crop&w=900&q=80')",
              }}
            >
              <span className="tag">04 • Court</span>
              <h3>Volleyball</h3>
            </Link>
          </div>
        </div>
      </section>

      {/* 8. Right Now: Live & Upcoming Table */}
      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="kicker">Right now</div>
              <h2>Live & upcoming.</h2>
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
              <div className="tr">
                <span>09:30</span>
                <span>
                  <b>100m Sprint</b>
                  <small style={{ display: "block", color: "#777" }}>Athletics · Finals</small>
                </span>
                <span>Main Track</span>
                <span className="status live">Live</span>
              </div>
            ) : (
              scheduledProgrammes.map((item) => (
                <div key={item.id} className="tr">
                  <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{item.timeSlot}</span>
                  <span>
                    <b>{item.eventName}</b>
                    <small style={{ display: "block", color: "#777" }}>
                      {item.sportName} · {item.category}
                    </small>
                  </span>
                  <span>{item.venueName}</span>
                  <span className={`status ${item.status === "Live" ? "live" : item.status === "Done" ? "done" : ""}`}>
                    {item.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 8.5 Tournament Regulations & Directives Accordion (Skiper103) */}
      <Skiper103 />

      {/* 9. Split Feature Band Light */}
      <section className="editorial-band light">
        <div className="wrap">
          <div className="split-feature">
            <div
              className="media"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&w=1400&q=85')",
              }}
            />
            <div className="copy">
              <div>
                <div className="kicker">HSU • ZENITHROW 2026</div>
                <h2 className="editorial-title">Built for the moment.</h2>
              </div>
              <p className="sub">
                From the first whistle to the final table, the experience stays clear, fast and connected.
              </p>
              <Link href="/my-result" className="btn primary" style={{ alignSelf: "flex-start" }}>
                Open My ZENITHROW →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 10. Committee Shared Footer */}
      <Footer />
    </div>
  );
}