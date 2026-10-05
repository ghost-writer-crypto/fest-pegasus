"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SmoothInput } from "@/components/ui/skiper-ui/skiper106";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setStatus("loading");
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      console.error("[forgot-password] Recovery request failed:", error);
      setStatus("error");
      setMessage("Unable to send the recovery email. Please try again.");
      return;
    }

    setStatus("success");
    setMessage(
      "If an account exists for this email, a password recovery link has been sent."
    );
  }

  if (status === "success") {
    return (
      <div
        className="pegasus-card"
        style={{
          padding: 24,
          borderRadius: "var(--radius-lg, 24px)",
          overflow: "hidden",
        }}
      >
        <strong>Check your email.</strong>

        <p style={{ marginTop: 10 }}>
          {message}
        </p>

        <a
          href="/login"
          className="pegasus-button"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 44,
            padding: "0 24px",
            borderRadius: "var(--radius-full, 9999px)",
              marginTop: 20,
            textDecoration: "none",
          }}
        >
          Return to Login
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <label
        htmlFor="email"
        style={{
          display: "block",
          marginBottom: 8,
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        Registered Email
      </label>

      <SmoothInput
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="operator@example.com"
        disabled={status === "loading"}
        caretColor="#E53935"
        style={{
          width: "100%",
          minHeight: 44,
          padding: "12px 16px",
          borderRadius: "var(--radius-sm, 12px)",
          border: "1px solid var(--border, rgba(255,255,255,0.08))",
          background: "var(--background)",
          color: "inherit",
          fontSize: 15,
        }}
      />

      {status === "error" && (
        <p
          role="alert"
          style={{
            marginTop: 10,
            fontSize: 13,
            padding: "10px 14px",
            borderRadius: "var(--radius-sm, 12px)",
              background: "rgba(229, 57, 53, 0.08)",
            border: "1px solid rgba(229, 57, 53, 0.2)",
          }}
        >
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="pegasus-button"
        style={{
          width: "100%",
          minHeight: 44,
          borderRadius: "var(--radius-full, 9999px)",
          marginTop: 16,
          cursor: status === "loading" ? "wait" : "pointer",
        }}
      >
        {status === "loading" ? "Sending…" : "Send Recovery Link"}
      </button>
    </form>
  );
}
