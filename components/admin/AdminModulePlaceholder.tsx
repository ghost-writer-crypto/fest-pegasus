import Link from "next/link";

type AdminModulePlaceholderProps = {
  title: string;
  category: string;
  description: string;
  futureFeatures: string[];
};

export default function AdminModulePlaceholder({
  title,
  category,
  description,
  futureFeatures,
}: AdminModulePlaceholderProps) {
  return (
    <div className="pegasus-animate-fade" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <section>
        <p className="pegasus-eyebrow" style={{ margin: "0 0 6px" }}>
          CONTROL ROOM • {category.toUpperCase()}
        </p>
        <h1
          style={{
            margin: 0,
            fontSize: "clamp(26px, 4vw, 36px)",
            fontWeight: 850,
            letterSpacing: "-0.03em",
            color: "var(--foreground)",
          }}
        >
          {title}
        </h1>
        <p
          style={{
            margin: "8px 0 0",
            fontSize: "14px",
            color: "var(--muted)",
            maxWidth: "680px",
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      </section>

      <section
        className="pegasus-card"
        style={{
          padding: "36px 28px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          background: "var(--surface)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span
            className="pegasus-status pegasus-status--pending"
            style={{ fontSize: "11px", padding: "4px 10px" }}
          >
            <span className="pegasus-status__dot" />
            Module Under Architecture
          </span>
          <span style={{ fontSize: "12px", color: "var(--muted)" }}>
            Administrative workflow scheduled for subsequent phase
          </span>
        </div>

        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 750, margin: "0 0 8px" }}>
            Planned Operational Scope
          </h2>
          <ul
            style={{
              margin: 0,
              paddingLeft: "20px",
              color: "var(--muted)",
              fontSize: "14px",
              lineHeight: 1.8,
            }}
          >
            {futureFeatures.map((feature, idx) => (
              <li key={idx}>{feature}</li>
            ))}
          </ul>
        </div>

        <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
          <Link href="/admin" className="pegasus-button pegasus-button--secondary">
            ← Return to Command Center
          </Link>
        </div>
      </section>
    </div>
  );
}

