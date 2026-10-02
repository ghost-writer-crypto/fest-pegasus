"use client";

import Link from "next/link";
import { ExternalLink, LogOut, Menu, X } from "lucide-react";
import { logoutAction } from "@/app/admin/actions";
import ShowQrButton from "@/components/qr/ShowQrButton";
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
    <header className="zenithrow-admin-header">
      <style>{`
        .zenithrow-admin-header {
          --line: rgba(255, 255, 255, 0.085);
          --line2: rgba(255, 255, 255, 0.16);
          --red: #e53935;
          --green: #22c55e;
          --blue: #2563eb;
          --muted: #8994a4;
          --text: #f5f7fa;
          padding: 14px 28px;
          border-bottom: 1px solid var(--line);
          background: rgba(10, 12, 16, 0.88);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 14px;
          position: sticky;
          top: 0;
          z-index: 40;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
          font-family: Inter, system-ui, -apple-system, sans-serif;
        }

        .zenithrow-admin-header .nav-toggle {
          display: none;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--line);
          color: #fff;
          border-radius: 8px;
          padding: 6px;
          cursor: pointer;
          align-items: center;
          justify-content: center;
          transition: background 0.18s ease;
        }
        .zenithrow-admin-header .nav-toggle:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: var(--line2);
        }

        .zenithrow-admin-header .btn {
          height: 32px;
          border-radius: 8px;
          border: 1px solid var(--line);
          background: #12161c;
          color: #dce2ea;
          padding: 0 12px;
          font-size: 11px;
          font-weight: 750;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.18s ease;
          text-decoration: none;
        }
        .zenithrow-admin-header .btn:hover {
          background: #1a2028;
          border-color: var(--line2);
          color: #fff;
          transform: translateY(-1px);
        }

        .zenithrow-admin-header .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px;
          border-radius: 8px;
          background: rgba(34, 197, 94, 0.06);
          border: 1px solid rgba(34, 197, 94, 0.22);
          color: #86efac;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.04em;
        }
        .zenithrow-admin-header .status-pill i {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--green);
          box-shadow: 0 0 8px rgba(34, 197, 94, 0.7);
          display: inline-block;
        }

        .zenithrow-admin-header .user-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.035);
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 4px 10px;
        }

        @media (max-width: 900px) {
          .zenithrow-admin-header {
            padding: 12px 18px;
          }
          .zenithrow-admin-header .nav-toggle {
            display: inline-flex;
          }
        }
      `}</style>

      {/* Left: Cockpit Brand Eyebrow & Mobile Hamburger */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <button
          type="button"
          className="nav-toggle"
          onClick={onToggleDrawer}
          aria-label={isDrawerOpen ? "Close menu" : "Open menu"}
          aria-expanded={isDrawerOpen}
        >
          {isDrawerOpen ? <X size={16} /> : <Menu size={16} />}
        </button>

        <div>
          <span
            style={{
              fontSize: "9px",
              fontWeight: 850,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--red)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontFamily: "ui-monospace, monospace",
            }}
          >
            <span
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: "var(--red)",
                boxShadow: "0 0 6px var(--red)",
                display: "inline-block",
              }}
            />
            ZENITHROW 2026 • CENTRAL COCKPIT
          </span>
          <span
            style={{
              fontSize: "13px",
              fontWeight: 800,
              letterSpacing: "-0.01em",
              color: "#fff",
              display: "block",
              marginTop: "1px",
            }}
          >
            Festival Control Center
          </span>
        </div>
      </div>

      {/* Right: Authenticated User Info, QR Action, Public Portal & Logout */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        {/* Authenticated Admin Identity */}
        {user ? (
          <div className="user-badge">
            <div style={{ display: "flex", flexDirection: "column", textAlign: "right" }}>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 750,
                  color: "#fff",
                  lineHeight: 1.2,
                }}
              >
                {user.fullName}
              </span>
              {user.email && (
                <span
                  style={{
                    fontSize: "9px",
                    color: "var(--muted)",
                    fontFamily: "ui-monospace, monospace",
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
                fontWeight: 850,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                background: "rgba(34, 197, 94, 0.12)",
                border: "1px solid rgba(34, 197, 94, 0.28)",
                color: "#86efac",
                padding: "2px 6px",
                borderRadius: "5px",
              }}
            >
              ADMIN
            </span>
          </div>
        ) : (
          <span
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: "10px",
              color: "var(--muted)",
              background: "rgba(255, 255, 255, 0.04)",
              padding: "4px 8px",
              borderRadius: "6px",
              border: "1px solid var(--line)",
            }}
          >
            ENV: LOCAL DEV
          </span>
        )}

        {/* On-demand Admin QR Action */}
        {user && user.qrToken && (
          <ShowQrButton
            data={{
              name: user.fullName,
              role: "admin",
              roleLabel: "Festival Administrator",
              identifier: `ID: ${user.userId.startsWith("a") ? user.userId.toUpperCase() : `A-${user.userId.slice(0, 6).toUpperCase()}`}`,
              qrUrl: `/qr/${user.qrToken}`,
              isPrivileged: true,
            }}
            label="Show Admin QR"
            variant="subtle"
            style={{ fontSize: "11px", padding: "5px 10px", minHeight: "32px", borderRadius: "8px" }}
          />
        )}

        {/* Operational Status Pill */}
        <div className="status-pill">
          <i />
          <span>OPERATIONAL</span>
        </div>

        {/* Link to Public Portal */}
        <Link href="/" className="btn">
          <span>Public Portal</span>
          <ExternalLink size={12} />
        </Link>

        {/* Secure Logout Action */}
        <form action={logoutAction} style={{ margin: 0 }}>
          <button
            type="submit"
            className="btn"
            style={{
              color: "#fca5a5",
              borderColor: "rgba(239, 68, 68, 0.25)",
              background: "rgba(239, 68, 68, 0.05)",
            }}
            title="Sign out of Admin Console"
          >
            <LogOut size={12} />
            <span>Logout</span>
          </button>
        </form>
      </div>
    </header>
  );
}
