import Link from "next/link";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <div
      style={{
        minHeight: "100svh",
        background: "var(--background, #0a0a0c)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          padding: "24px clamp(20px, 4vw, 36px)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border, rgba(255, 255, 255, 0.07))",
        }}
      >
        <Link href="/" className="brand" style={{ textDecoration: "none" }}>
          <span>ZENITHROW</span>
        </Link>

        <Link
          href="/login"
          className="pill"
          style={{ textDecoration: "none" }}
        >
          Back to login
        </Link>
      </header>

      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 420 }}>
          <div style={{ marginBottom: 32 }}>
            <span
              style={{
                fontSize: "10px",
                letterSpacing: "0.18em",
                fontWeight: 700,
                textTransform: "uppercase",
                color: "var(--primary, #e53935)",
                display: "block",
                marginBottom: "8px",
              }}
            >
              Account recovery
            </span>

            <h1
              style={{
                fontSize: "clamp(1.75rem, 3.5vw, 2.25rem)",
                fontWeight: 900,
                letterSpacing: "-0.04em",
                lineHeight: 1.1,
                margin: "0 0 10px",
              }}
            >
              Reset your password
            </h1>

            <p
              style={{
                fontSize: "14px",
                color: "var(--text-secondary, #8e8e93)",
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              Enter your registered operator email address to receive a secure password recovery link.
            </p>
          </div>

          <ForgotPasswordForm />
        </div>
      </main>

      <footer
        style={{
          padding: "24px 32px",
          textAlign: "center",
          fontSize: 11,
          letterSpacing: "0.08em",
          color: "var(--text-muted, #6e6e73)",
          textTransform: "uppercase",
          borderTop: "1px solid var(--border, rgba(255, 255, 255, 0.07))",
        }}
      >
        ZENITHROW 2026 · Operator portal
      </footer>
    </div>
  );
}