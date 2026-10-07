"use client";

import { useEffect, useState } from "react";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();

    async function prepareRecoverySession() {
      const hash = window.location.hash;

      if (!hash) {
        setError("This recovery link is missing or invalid.");
        return;
      }

      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const type = params.get("type");

      if (type !== "recovery" || !accessToken || !refreshToken) {
        setError("This recovery link is invalid or incomplete.");
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        console.error(
          "[reset-password] Recovery session failed:",
          sessionError,
        );
        setError(
          "This recovery link is invalid or has expired. Please request a new one.",
        );
        return;
      }

      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );

      setReady(true);
    }

    void prepareRecoverySession();
  }, []);

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

          {!ready && !error && (
            <div className="pegasus-card" style={{ padding: 24 }}>
              Verifying your recovery linkÃ¢â‚¬Â¦
            </div>
          )}

          {error && (
            <div className="pegasus-card" style={{ padding: 24 }}>
              <strong>Recovery link unavailable.</strong>

              <p style={{ marginTop: 10 }}>{error}</p>

              <a
                href="/forgot-password"
                className="pegasus-button"
                style={{
                  display: "inline-flex",
                  marginTop: 20,
                  textDecoration: "none",
                }}
              >
                Request New Link
              </a>
            </div>
          )}

          {ready && <ResetPasswordForm />}
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

