"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SmoothInput } from "@/components/ui/skiper-ui/skiper106";

export default function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 8) {
      setStatus("error");
      setMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }

    setStatus("loading");
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      console.error("[reset-password] Password update failed:", error);
      setStatus("error");
      setMessage(
        "Unable to update your password. Please request a new recovery link.",
      );
      return;
    }

    setStatus("success");
    setMessage("Your password has been updated successfully.");
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
        <strong>Password updated.</strong>

        <p style={{ marginTop: 10 }}>{message}</p>

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
          Continue to Login
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <label
        htmlFor="password"
        style={{
          display: "block",
          marginBottom: 8,
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        New Password
      </label>

      <SmoothInput
        id="password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
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

      <label
        htmlFor="confirm-password"
        style={{
          display: "block",
          marginTop: 16,
          marginBottom: 8,
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        Confirm New Password
      </label>

      <SmoothInput
        id="confirm-password"
        name="confirm-password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
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
            marginTop: 12,
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
          marginTop: 20,
          cursor: status === "loading" ? "wait" : "pointer",
        }}
      >
        {status === "loading" ? "Updating…" : "Update Password"}
      </button>
    </form>
  );
}
