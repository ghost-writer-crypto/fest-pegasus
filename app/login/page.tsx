import type { Metadata } from "next";
import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Operator Login — PEGASUS Sports Fest",
  description: "Official operational authentication portal for PEGASUS Sports Festival 2026",
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
    <div style={{ minHeight: "100vh", background: "#F8FAFC", display: "flex", flexDirection: "column" }}>
      {/* Top Header */}
      <header
        style={{
          borderBottom: "1px solid #E8EDF3",
          background: "#FFFFFF",
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
            <span className="pegasus-brand__mark">P</span>
            <span className="pegasus-brand__name">PEGASUS</span>
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
              fontFamily: "ui-monospace, monospace",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#E53737",
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
              color: "#1A3663",
              margin: 0,
            }}
          >
            Operational Command Center
          </h1>
          <p style={{ fontSize: "14px", color: "#64748B", margin: "8px 0 0", lineHeight: 1.5 }}>
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
          borderTop: "1px solid #E8EDF3",
          padding: "16px 24px",
          textAlign: "center",
          fontSize: "11px",
          color: "#8492A6",
          fontFamily: "ui-monospace, monospace",
        }}
      >
        PEGASUS 2026 // AUTHORIZED OPERATOR TERMINAL // ISO 27001 SECURED
      </footer>
    </div>
  );
}

