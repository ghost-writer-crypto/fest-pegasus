"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginWithCredentialsAction, loginAsDemoRoleAction } from "@/app/login/actions";

interface LoginFormProps {
  redirectUrl?: string;
  errorCode?: string;
  isLoggedOut?: boolean;
  isDevelopment?: boolean;
}

const ROLES_LIST = [

  {
    key: "admin",
    roleLabel: "Festival Director",
    roleBadge: "ADMIN",
    roleColor: "#1A3663",
    roleBg: "rgba(26, 54, 99, 0.08)",
    badgeColor: "#d7ff3f",
    badgeBg: "rgba(215, 255, 63, 0.15)",
    description: "Festival Command Center: Tournament control, participant roster, appeals adjudication & publication.",
    dest: "/admin",
  },
  {
    key: "judge",
    roleLabel: "Chief Track Referee",
    roleBadge: "JUDGE",
    roleColor: "#101010",
    roleBg: "rgba(0, 0, 0, 0.04)",
    badgeColor: "#38bdf8",
    badgeBg: "rgba(56, 189, 248, 0.15)",
    description: "Field Referee Desk: Scorecard entry, finish times, heats verification & station QR.",
    dest: "/judge",
  },
  {
    key: "team_manager_garuda",
    roleLabel: "Garuda House Captain",
    roleBadge: "GARUDA (GAR)",
    roleColor: "#8B0000",
    roleBg: "rgba(139, 0, 0, 0.05)",
    badgeColor: "#F2B84B",
    badgeBg: "rgba(242, 184, 75, 0.15)",
    description: "House Command: Squad roster quota management, Tug-of-War weight checks & disputes.",
    dest: "/team-manager",
  },
  {
    key: "team_manager_toofan",
    roleLabel: "Toofan House Captain",
    roleBadge: "TOOFAN (TOF)",
    roleColor: "#1E3A8A",
    roleBg: "rgba(30, 58, 138, 0.05)",
    badgeColor: "#5B9BD5",
    badgeBg: "rgba(91, 155, 213, 0.15)",
    description: "House Command: Squad roster, substitute nominations & official result tracking.",
    dest: "/team-manager",
  },
  {
    key: "desk_operator",
    roleLabel: "Control Desk Operator",
    roleBadge: "DESK OPS",
    roleColor: "#065F46",
    roleBg: "rgba(6, 95, 70, 0.05)",
    badgeColor: "#34D399",
    badgeBg: "rgba(52, 211, 153, 0.15)",
    description: "Scoring & Check-in Desk: Rapid participant check-in, score ingestion & printout desk.",
    dest: "/admin/verification",
  },
];

export default function LoginForm({
  redirectUrl = "",
  errorCode,
  isLoggedOut = false,
  isDevelopment = false,
}: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(loginWithCredentialsAction, null);

  let alertMessage: string | null = null;
  if (errorCode === "unauthorized_admin") {
    alertMessage = "Access Restricted: Administrator privileges required to enter the Central Cockpit.";
  } else if (errorCode === "unauthorized_judge") {
    alertMessage = "Access Restricted: Official Referee credentials required to access the Field Desk.";
  } else if (errorCode === "unauthorized_tm") {
    alertMessage = "Access Restricted: Team Manager authentication required to access House Command.";
  } else if (errorCode === "demo_disabled_in_production") {
    alertMessage = "Security Notice: Demonstration account switcher is strictly disabled in production. Individual credentials required.";
  } else if (errorCode === "unauthorized") {
    alertMessage = "Please authenticate with an authorized account to access this operational console.";
  } else if (isLoggedOut) {
    alertMessage = "You have been safely signed out of your operational session.";
  }

  return (
    <div style={{ width: "100%", maxWidth: isDevelopment ? "980px" : "480px", margin: "0 auto" }}>
      {/* Alert Banner */}
      {alertMessage && (
        <div
          style={{
            padding: "12px 18px",
            marginBottom: "24px",
            borderRadius: "3px",
            background: isLoggedOut ? "#F8FAFC" : "rgba(229, 55, 55, 0.08)",
            border: isLoggedOut ? "1px solid #C9D3DF" : "1px solid rgba(229, 55, 55, 0.3)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
          role="alert"
        >
          <span
            style={{
              fontFamily: "ui-monospace, monospace",
              fontWeight: 800,
              fontSize: "10px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "2px 6px",
              borderRadius: "2px",
              background: isLoggedOut ? "#1A3663" : "#E53737",
              color: "#FFFFFF",
            }}
          >
            {isLoggedOut ? "LOGGED OUT" : "AUTH REQUIRED"}
          </span>
          <span style={{ fontSize: "13px", color: isLoggedOut ? "#1A3663" : "#E53737", fontWeight: 600 }}>
            {alertMessage}
          </span>
        </div>
      )}

      <div
        style={{
          display: isDevelopment ? "grid" : "block",
          gridTemplateColumns: isDevelopment ? "repeat(auto-fit, minmax(320px, 1fr))" : undefined,
          gap: "32px",
          alignItems: "start",
        }}
      >
        {/* Left Column: Fast-Switcher for Local Development Only */}
        {isDevelopment && (
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E8EDF3",
              borderRadius: "4px",
              padding: "24px",
              boxShadow: "0 2px 12px rgba(26, 54, 99, 0.04)",
            }}
          >
            <div style={{ marginBottom: "16px", borderBottom: "1px solid #E8EDF3", paddingBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span
                  style={{
                    fontFamily: "ui-monospace, monospace",
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "#E53737",
                  }}
                >
                  DEV ONLY // TEST SWITCHER
                </span>
                <span
                  style={{
                    fontFamily: "ui-monospace, monospace",
                    fontSize: "9px",
                    fontWeight: 800,
                    background: "#FEE2E2",
                    color: "#E53737",
                    padding: "2px 6px",
                    borderRadius: "2px",
                  }}
                >
                  NON-PRODUCTION
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "#64748B", margin: "6px 0 0", lineHeight: 1.4 }}>
                Local development shortcut for testing station consoles without Supabase auth.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {ROLES_LIST.map((r) => (
                <form
                  key={r.key}
                  action={async () => {
                    await loginAsDemoRoleAction(r.key, redirectUrl);
                  }}
                  style={{ margin: 0 }}
                >
                  <button
                    type="submit"
                    style={{
                      width: "100%",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      padding: "12px 14px",
                      textAlign: "left",
                      background: r.roleBg,
                      border: "1px solid #E8EDF3",
                      borderRadius: "3px",
                      cursor: "pointer",
                      transition: "all 140ms ease",
                    }}
                    className="pegasus-role-switch-btn"
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "13px", fontWeight: 750, color: "#1A3663" }}>
                        {r.roleLabel}
                      </span>
                      <span
                        style={{
                          fontFamily: "ui-monospace, monospace",
                          fontSize: "9px",
                          fontWeight: 800,
                          padding: "2px 6px",
                          borderRadius: "2px",
                          background: "#1A3663",
                          color: "#FFFFFF",
                        }}
                      >
                        {r.roleBadge}
                      </span>
                    </div>
                    <span style={{ fontSize: "11px", color: "#64748B", lineHeight: 1.3 }}>
                      {r.description}
                    </span>
                  </button>
                </form>
              ))}
            </div>
          </div>
        )}


        {/* Right Column: Standard Credentials Login */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E8EDF3",
            borderRadius: "4px",
            padding: "24px",
            boxShadow: "0 2px 12px rgba(26, 54, 99, 0.04)",
          }}
        >
          <div style={{ marginBottom: "20px", borderBottom: "1px solid #E8EDF3", paddingBottom: "12px" }}>
            <span
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#64748B",
                display: "block",
                marginBottom: "4px",
              }}
            >
              OPERATOR CREDENTIAL SIGN-IN
            </span>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#1A3663" }}>
              Sign In to Your Station
            </h2>
            <p style={{ fontSize: "12px", color: "#64748B", margin: "4px 0 0" }}>
              Enter your assigned festival email and official access key.
            </p>
          </div>

          <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <input type="hidden" name="redirectTo" value={redirectUrl} />

            {state && !state.success && (
              <div
                style={{
                  padding: "10px 12px",
                  background: "rgba(229, 55, 55, 0.08)",
                  border: "1px solid rgba(229, 55, 55, 0.3)",
                  borderRadius: "3px",
                  fontSize: "12px",
                  color: "#E53737",
                  fontWeight: 600,
                }}
              >
                {state.error}
              </div>
            )}

            <div>
              <label
                htmlFor="login-email"
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: 750,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "#26364A",
                  marginBottom: "6px",
                }}
              >
                Operator Email / Role
              </label>
              <input
                id="login-email"
                name="email"
                type="text"
                required
                placeholder="e.g. admin@pegasus.internal or judge"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #CBD5E1",
                  borderRadius: "3px",
                  fontSize: "13px",
                  color: "#1A3663",
                  background: "#F8FAFC",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: 750,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "#26364A",
                  marginBottom: "6px",
                }}
              >
                Access Key / Password
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                required
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #CBD5E1",
                  borderRadius: "3px",
                  fontSize: "13px",
                  color: "#1A3663",
                  background: "#F8FAFC",
                  outline: "none",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="pegasus-button pegasus-button--primary"
              style={{
                width: "100%",
                minHeight: "44px",
                marginTop: "8px",
                background: "#1A3663",
                borderColor: "#1A3663",
                color: "#FFFFFF",
                fontSize: "12px",
                letterSpacing: "0.08em",
              }}
            >
              {isPending ? "Authenticating..." : "Authorize Station Access ↗"}
            </button>

            <div style={{ borderTop: "1px solid #E8EDF3", paddingTop: "14px", marginTop: "4px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "#64748B" }}>Need spectator access?</span>
                <Link
                  href="/"
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#1A3663",
                    textDecoration: "underline",
                  }}
                >
                  Return to Public Site →
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

