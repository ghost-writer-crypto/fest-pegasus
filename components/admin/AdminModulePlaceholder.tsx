import Link from "next/link";
import { ArrowLeft, Clock, ShieldCheck, Cpu, CheckCircle2, ChevronRight } from "lucide-react";

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
    <div className="zenithrow-placeholder-root">
      <style>{`
        .zenithrow-placeholder-root {
          --line: rgba(255, 255, 255, 0.085);
          --line2: rgba(255, 255, 255, 0.16);
          --red: #e53935;
          --red-glow: rgba(229, 57, 53, 0.28);
          --amber: #f59e0b;
          --blue: #2563eb;
          --muted: #8994a4;
          --fg: #f5f7fa;
          display: flex;
          flex-direction: column;
          gap: 24px;
          max-width: 1200px;
          margin: 0 auto;
          color: var(--fg);
          font-family: Inter, system-ui, -apple-system, sans-serif;
        }

        .zenithrow-placeholder-header {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .zenithrow-placeholder-kicker {
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--red);
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .zenithrow-placeholder-kicker::before {
          content: "";
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--red);
          box-shadow: 0 0 8px var(--red);
        }

        .zenithrow-placeholder-title {
          margin: 0;
          font-size: clamp(26px, 3.5vw, 36px);
          font-weight: 850;
          letter-spacing: -0.03em;
          color: #fff;
          line-height: 1.15;
        }

        .zenithrow-placeholder-desc {
          margin: 0;
          font-size: 14px;
          color: var(--muted);
          max-width: 720px;
          line-height: 1.6;
        }

        .zenithrow-placeholder-card {
          background: linear-gradient(145deg, rgba(17, 21, 26, 0.94), rgba(11, 13, 17, 0.98));
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 32px 30px;
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.4);
          display: flex;
          flex-direction: column;
          gap: 28px;
          position: relative;
          overflow: hidden;
        }

        .zenithrow-placeholder-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, var(--red), var(--amber), transparent 70%);
        }

        .zenithrow-placeholder-status-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--line);
        }

        .zenithrow-placeholder-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 6px 12px;
          border-radius: 9px;
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.28);
          color: #fbbf24;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .zenithrow-placeholder-badge i {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #fbbf24;
          box-shadow: 0 0 6px #fbbf24;
        }

        .zenithrow-placeholder-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
        }

        .zenithrow-placeholder-feature {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 16px 18px;
          display: flex;
          gap: 14px;
          align-items: flex-start;
          transition: all 0.18s ease;
        }
        .zenithrow-placeholder-feature:hover {
          border-color: var(--line2);
          background: rgba(255, 255, 255, 0.035);
          transform: translateY(-1px);
        }

        .zenithrow-placeholder-num {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 11px;
          font-weight: 800;
          color: var(--red);
          background: rgba(229, 57, 53, 0.12);
          border: 1px solid rgba(229, 57, 53, 0.25);
          border-radius: 6px;
          padding: 3px 7px;
          flex-shrink: 0;
        }

        .zenithrow-placeholder-text {
          font-size: 13px;
          line-height: 1.5;
          color: #e2e8f0;
        }

        .zenithrow-placeholder-telemetry {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
          padding: 18px 20px;
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid var(--line);
        }

        .zenithrow-placeholder-telem-item {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .zenithrow-placeholder-telem-icon {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          background: #14181e;
          border: 1px solid var(--line);
          display: grid;
          place-items: center;
          color: var(--red);
          flex-shrink: 0;
        }
        .zenithrow-placeholder-telem-label {
          font-size: 10px;
          font-weight: 750;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--muted);
        }
        .zenithrow-placeholder-telem-val {
          font-size: 12px;
          font-weight: 800;
          color: #fff;
          margin-top: 2px;
        }

        .zenithrow-placeholder-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .zenithrow-placeholder-btn {
          height: 38px;
          padding: 0 18px;
          border-radius: 9px;
          font-size: 12px;
          font-weight: 750;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.18s ease;
          cursor: pointer;
        }
        .zenithrow-placeholder-btn-primary {
          background: var(--red);
          border: 1px solid var(--red);
          color: #fff;
        }
        .zenithrow-placeholder-btn-primary:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }
        .zenithrow-placeholder-btn-secondary {
          background: #151920;
          border: 1px solid var(--line);
          color: #dce2ea;
        }
        .zenithrow-placeholder-btn-secondary:hover {
          background: #1c222b;
          border-color: var(--line2);
          color: #fff;
          transform: translateY(-1px);
        }
      `}</style>

      {/* Header Section */}
      <section className="zenithrow-placeholder-header">
        <div className="zenithrow-placeholder-kicker">
          ZENITHROW 2026 • COMMAND CONSOLE • {category.toUpperCase()}
        </div>
        <h1 className="zenithrow-placeholder-title">{title}</h1>
        <p className="zenithrow-placeholder-desc">{description}</p>
      </section>

      {/* Main Glassmorphic Card */}
      <section className="zenithrow-placeholder-card">
        {/* Status Pill & Metadata Row */}
        <div className="zenithrow-placeholder-status-row">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span className="zenithrow-placeholder-badge">
              <i />
              Module Under Architecture
            </span>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>
              Administrative engine scheduled for deployment phase
            </span>
          </div>

          <span
            style={{
              fontSize: "11px",
              fontFamily: "ui-monospace, monospace",
              color: "var(--muted)",
              letterSpacing: "0.06em",
            }}
          >
            PHASE 2 • LIVE PIPELINE
          </span>
        </div>

        {/* Planned Features Grid */}
        <div>
          <h2
            style={{
              fontSize: "15px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "#fff",
              margin: "0 0 14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Clock size={16} color="var(--red)" />
            Planned Operational Scope &amp; Deliverables
          </h2>

          <div className="zenithrow-placeholder-grid">
            {futureFeatures.map((feature, idx) => (
              <div key={idx} className="zenithrow-placeholder-feature">
                <span className="zenithrow-placeholder-num">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span className="zenithrow-placeholder-text">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* System Architecture Telemetry */}
        <div className="zenithrow-placeholder-telemetry">
          <div className="zenithrow-placeholder-telem-item">
            <div className="zenithrow-placeholder-telem-icon">
              <Cpu size={16} />
            </div>
            <div>
              <div className="zenithrow-placeholder-telem-label">Target Architecture</div>
              <div className="zenithrow-placeholder-telem-val">ZENITHROW v2.6 Next.js</div>
            </div>
          </div>

          <div className="zenithrow-placeholder-telem-item">
            <div className="zenithrow-placeholder-telem-icon">
              <ShieldCheck size={16} />
            </div>
            <div>
              <div className="zenithrow-placeholder-telem-label">Access Clearance</div>
              <div className="zenithrow-placeholder-telem-val">Role Level • Chief Marshal</div>
            </div>
          </div>

          <div className="zenithrow-placeholder-telem-item">
            <div className="zenithrow-placeholder-telem-icon">
              <CheckCircle2 size={16} />
            </div>
            <div>
              <div className="zenithrow-placeholder-telem-label">Transactional Engine</div>
              <div className="zenithrow-placeholder-telem-val">Atomic PostgreSQL RLS</div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="zenithrow-placeholder-actions">
          <Link href="/admin" className="zenithrow-placeholder-btn zenithrow-placeholder-btn-primary">
            <ArrowLeft size={14} />
            <span>Return to Command Center</span>
          </Link>
          <Link href="/admin/competitions" className="zenithrow-placeholder-btn zenithrow-placeholder-btn-secondary">
            <span>Tournament Registry</span>
            <ChevronRight size={14} />
          </Link>
          <Link href="/admin/schedule" className="zenithrow-placeholder-btn zenithrow-placeholder-btn-secondary">
            <span>Master Schedule</span>
            <ChevronRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
}
