import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export default function ResetPasswordPage() {
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
        <a href="/" className="pegasus-brand">
          <span className="pegasus-brand__mark">Z</span>
          <span className="pegasus-brand__name">ZENITHROW</span>
        </a>
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
            <span>SECURE RECOVERY // AUTHORIZED USERS</span>

            <h1 style={{ marginTop: 12 }}>
              Set a new password
            </h1>

            <p style={{ marginTop: 12 }}>
              Choose a new password for your ZENITHROW operator account.
            </p>
          </div>

          <ResetPasswordForm />
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