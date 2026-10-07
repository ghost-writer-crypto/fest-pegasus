import type { Metadata } from "next";
import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Operator Login — ZENITHROW Sports Festival 2026",
  description: "Official operational authentication portal for ZENITHROW Sports Festival 2026",
};

interface LoginPageProps {
  searchParams: Promise<{
    redirect?: string;
    error?: string;
    logged_out?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectUrl = params.redirect || "";
  const errorCode = params.error || "";
  const isLoggedOut = Boolean(params.logged_out);

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", flexDirection: "column" }}>
      {/* Top Header */}
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          padding: "16px 24px",
        }}
      >
        <div
          style={{
            maxWidth: "1140px",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Link href="/" className="pegasus-brand">
            <span className="pegasus-brand__mark">Z</span>
            <span className="pegasus-brand__name">ZENITHROW</span>
          </Link>

          <Link
            href="/"
            className="pegasus-button pegasus-button--subtle"
            style={{ fontSize: "11px", padding: "6px 12px", minHeight: "32px" }}
          >
            Public Site ↗
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          padding: "48px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "32px", maxWidth: "600px" }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--primary)",
              display: "inline-block",
              marginBottom: "8px",
            }}
          >
            RESTRICTED ACCESS // OFFICIALS ONLY
          </span>
          <h1
            style={{
              fontSize: "clamp(28px, 4vw, 36px)",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              color: "var(--text-primary)",
              fontFamily: "var(--font-heading)",
              margin: 0,
            }}
          >
            Operational Command Center
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: "8px 0 0", lineHeight: 1.5, fontFamily: "var(--font-sans)" }}>
            Access authorized terminals for Tournament Control, Referee Field Desk, and House Command.
          </p>
        </div>

        <LoginForm
          redirectUrl={redirectUrl}
          errorCode={errorCode}
          isLoggedOut={isLoggedOut}
          isDevelopment={process.env.NODE_ENV !== "production"}
        />

      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          background: "var(--surface)",
          padding: "16px 24px",
          textAlign: "center",
          fontSize: "11px",
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono)",
        }}
      >
        ZENITHROW 2026 // AUTHORIZED OPERATOR TERMINAL // ISO 27001 SECURED
      </footer>
    </div>
  );
}

