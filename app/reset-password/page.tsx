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
        <a href="/" className="brand" style={{ textDecoration: "none" }}>
          <span>ZENITHROW</span>
        </a>
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
              Account security
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
              Set a new password
            </h1>

            <p
              style={{
                fontSize: "14px",
                color: "var(--text-secondary, #8e8e93)",
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              Choose a strong new password for your operator account.
            </p>
          </div>

          {!ready && !error && (
            <div
              style={{
                padding: "24px",
                borderRadius: "var(--radius-md, 16px)",
                background: "var(--surface-1, #141416)",
                border: "1px solid var(--border, rgba(255, 255, 255, 0.07))",
                fontSize: "14px",
                color: "var(--text-secondary, #8e8e93)",
              }}
            >
              Verifying your recovery link...
            </div>
          )}

          {error && (
            <div
              style={{
                padding: "24px",
                borderRadius: "var(--radius-md, 16px)",
                background: "var(--surface-1, #141416)",
                border: "1px solid var(--border, rgba(255, 255, 255, 0.07))",
              }}
            >
              <strong style={{ fontSize: "15px", display: "block", marginBottom: "8px" }}>
                Recovery link unavailable
              </strong>

              <p style={{ margin: "0 0 16px", fontSize: "14px", color: "var(--text-secondary, #8e8e93)", lineHeight: 1.55 }}>
                {error}
              </p>

              <a
                href="/forgot-password"
                className="btn primary"
                style={{
                  display: "inline-flex",
                  textDecoration: "none",
                }}
              >
                Request new link
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

