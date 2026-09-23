"use client";

import Link from "next/link";
import { logoutAction } from "@/app/admin/actions";
import type { AdminUserIdentity } from "./AdminShellClient";

interface AdminHeaderProps {
  user: AdminUserIdentity;
  isDrawerOpen?: boolean;
  onToggleDrawer?: () => void;
}

export default function AdminHeader({
  user,
  isDrawerOpen = false,
  onToggleDrawer,
}: AdminHeaderProps) {
  return (
    <header className="pegasus-admin-topbar">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        {/* Mobile Navigation Toggle */}
        <button
          type="button"
          className="pegasus-admin-hamburger"
          onClick={onToggleDrawer}
          aria-label={isDrawerOpen ? "Close menu" : "Open menu"}
          aria-expanded={isDrawerOpen}
          aria-controls="pegasus-admin-sidebar"
        >
          <span style={{ fontSize: "16px", fontWeight: "bold" }}>☰</span>
        </button>

        <div>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 800,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--accent)",
              display: "block",
            }}
          >
            CENTRAL COCKPIT
          </span>
          <span
            style={{
              fontSize: "14px",
              fontWeight: 750,
              color: "var(--foreground)",
            }}
          >
            Festival Control Center
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        {/* Authenticated Admin Identity */}
        {user ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "4px 10px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", textAlign: "right" }}>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--foreground)",
                  lineHeight: 1.2,
                }}
              >
                {user.fullName}
              </span>
              {user.email && (
                <span
                  style={{
                    fontSize: "10px",
                    color: "var(--muted)",
                    fontFamily: "monospace",
                    lineHeight: 1.1,
                  }}
                >
                  {user.email}
                </span>
              )}
            </div>
            <span
              style={{
                fontSize: "9px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                background: "rgba(215, 255, 63, 0.15)",
                color: "var(--accent)",
                padding: "2px 6px",
                borderRadius: "4px",
              }}
            >
              ADMIN
            </span>
          </div>
        ) : (
          <span
            style={{
              fontFamily: "monospace",
              fontSize: "11px",
              color: "var(--muted)",
              background: "rgba(255, 255, 255, 0.04)",
              padding: "4px 8px",
              borderRadius: "4px",
              border: "1px solid var(--border)",
            }}
          >
            ENV: LOCAL DEV
          </span>
        )}

        <span
          className="pegasus-status pegasus-status--live"
          style={{ fontSize: "11px", padding: "3px 8px" }}
        >
          <span className="pegasus-status__dot" />
          Operational
        </span>

        <Link
          href="/"
          className="pegasus-button pegasus-button--subtle"
          style={{ fontSize: "11px", padding: "6px 10px", minHeight: "30px" }}
        >
          Public Portal <span>↗</span>
        </Link>

        {/* Secure Logout Action */}
        <form action={logoutAction} style={{ margin: 0 }}>
          <button
            type="submit"
            className="pegasus-button pegasus-button--subtle"
            style={{
              fontSize: "11px",
              padding: "6px 10px",
              minHeight: "30px",
              color: "var(--status-dns)",
              borderColor: "rgba(255, 80, 80, 0.2)",
            }}
            title="Sign out of Admin Console"
          >
            Logout
          </button>
        </form>
      </div>
    </header>
  );
}
