export default function HsuLiveTicker() {
  const items = [
    { text: "● LIVE", isLive: true },
    { text: "ZENITHROW 2026" },
    { text: "5 DISCIPLINES" },
    { text: "LIVE VERIFIED RESULTS" },
    { text: "HOUSE CHAMPIONSHIP" },
    { text: "HAMDAN STUDENTS UNION" },
  ];

  return (
    <div className="ticker" aria-label="Live Festival Telemetry Banner">
      <div className="ticker-track">
        {/* Repeating sequence for continuous animation */}
        {[...items, ...items, ...items, ...items].map((item, idx) => (
          <span
            key={idx}
            className={item.isLive ? "live-dot" : ""}
            style={item.isLive ? { color: "var(--hsu-red)", fontWeight: 900 } : {}}
          >
            {item.text}
          </span>
        ))}
      </div>
    </div>
  );
}
