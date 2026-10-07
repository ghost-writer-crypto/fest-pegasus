import Link from "next/link";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--background)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          padding: "24px 32px",
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
          href="/login"
          className="pegasus-button pegasus-button--subtle"
        >
          Back to Login
        </Link>
      </header>

      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 20px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 460 }}>
          <div style={{ marginBottom: 28 }}>
            <span>ACCOUNT RECOVERY // AUTHORIZED USERS</span>

            <h1 style={{ marginTop: 12 }}>
              Reset your password
            </h1>

            <p style={{ marginTop: 12 }}>
              Enter your registered email address and we&apos;ll send you
              a secure password recovery link.
            </p>
          </div>

          <ForgotPasswordForm />
        </div>
      </main>

      <footer
        style={{
          padding: "24px 32px",
          textAlign: "center",
          fontSize: 12,
          opacity: 0.6,
        }}
      >
        ZENITHROW 2026 // AUTHORIZED OPERATOR TERMINAL
      </footer>
    </div>
  );
}