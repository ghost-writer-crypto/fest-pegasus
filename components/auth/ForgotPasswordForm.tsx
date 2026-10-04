"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
      <div className="pegasus-card" style={{ padding: 24 }}>
        <strong>Check your email.</strong>

        <p style={{ marginTop: 10 }}>
          {message}
        </p>

        <a
          href="/login"
          className="pegasus-button"
          style={{
            display: "inline-flex",
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

      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="operator@example.com"
        disabled={status === "loading"}
        style={{
          width: "100%",
          padding: "14px 16px",
          borderRadius: 10,
          border: "1px solid var(--border, #ccc)",
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
          marginTop: 16,
          cursor: status === "loading" ? "wait" : "pointer",
        }}
      >
        {status === "loading" ? "Sending…" : "Send Recovery Link"}
      </button>
    </form>
  );
}
