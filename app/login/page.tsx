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
    <div style={{ minHeight: "100svh", background: "var(--background)", display: "flex", flexDirection: "column" }}>
      {/* Top Header */}
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          padding: "14px 24px",
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
            style={{ fontSize: "12px", padding: "6px 14px", minHeight: "34px" }}
          >
            Public site ↗
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
        <div style={{ textAlign: "center", marginBottom: "32px", maxWidth: "480px" }}>
          <p className="page-kicker" style={{ marginBottom: "12px" }}>
            Officials only
          </p>
          <h1
            style={{
              fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              color: "var(--text-primary)",
              margin: "0 0 10px",
              lineHeight: 1.1,
            }}
          >
            Operator portal.
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
            Access authorized terminals for Tournament Control, Referee Desk, and House Command.
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
          padding: "14px 24px",
          textAlign: "center",
          fontSize: "11px",
          color: "var(--text-muted)",
          letterSpacing: "0.08em",
        }}
      >
        ZENITHROW 2026 · Authorized Operator Terminal
      </footer>
    </div>
  );
}
