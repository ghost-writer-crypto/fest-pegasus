"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href?: string;
  status: "active" | "available" | "coming_soon";
};

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/admin", status: "available" },
  { label: "Participants", href: "/admin/participants", status: "available" },
  { label: "Substitutions", href: "/admin/substitutions", status: "available" },
  { label: "Teams", href: "/admin/teams", status: "available" },
  { label: "Penalties", href: "/admin/penalties", status: "available" },
  { label: "Sports", href: "/admin/sports", status: "available" },
  { label: "Events", href: "/admin/events", status: "available" },
  { label: "Competitions", href: "/admin/competitions", status: "available" },
  { label: "Venues", href: "/admin/venues", status: "available" },
  { label: "Schedule", href: "/admin/schedule", status: "available" },
  { label: "Fixtures", href: "/admin/fixtures", status: "available" },
  { label: "Live", href: "/admin/live", status: "available" },
  { label: "Results", href: "/admin/results", status: "available" },
  { label: "Verification", href: "/admin/verification", status: "available" },
  { label: "Publish", href: "/admin/publish", status: "available" },
  { label: "Certificates", href: "/admin/certificates", status: "available" },
  { label: "Settings", href: "/admin/settings", status: "available" },
];

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function AdminSidebar({
  isOpen = false,
  onClose,
}: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      id="pegasus-admin-sidebar"
      className={`pegasus-admin-sidebar ${isOpen ? "is-open" : ""}`}
      aria-label="Admin Navigation"
    >
      <div>
        <div
          style={{
            padding: "0 4px 16px",
            borderBottom: "1px solid var(--border)",
            marginBottom: "16px",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--accent)",
                display: "block",
              }}
            >
              FESTIVAL CONTROL ROOM
            </span>
            <strong
              style={{
                fontSize: "16px",
                fontWeight: 850,
                letterSpacing: "-0.02em",
              }}
            >
              PEGASUS ADMIN
            </strong>
          </div>

          {/* Close button for mobile drawer */}
          {isOpen && (
            <button
              type="button"
              onClick={onClose}
              className="pegasus-button pegasus-button--subtle"
              style={{
                padding: "2px 8px",
                minHeight: "28px",
                fontSize: "14px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              aria-label="Close navigation menu"
            >
              ✕
            </button>
          )}
        </div>

        <nav className="pegasus-admin-nav-group">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href
              ? item.href === "/admin"
                ? pathname === "/admin"
                : pathname === item.href || pathname.startsWith(item.href + "/")
              : false;

            if (item.status === "coming_soon" || !item.href) {
              return (
                <div
                  key={item.label}
                  className="pegasus-admin-nav-item pegasus-admin-nav-item--disabled"
                >
                  <span>{item.label}</span>
                  <span className="pegasus-admin-pill pegasus-admin-pill--soon">
                    Soon
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                className={`pegasus-admin-nav-item ${
                  isActive ? "pegasus-admin-nav-item--active" : ""
                }`}
              >
                <span>{item.label}</span>
                {isActive && (
                  <span className="pegasus-admin-pill pegasus-admin-pill--active">
                    Active
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div
        style={{
          paddingTop: "16px",
          borderTop: "1px solid var(--border)",
          fontSize: "11px",
          color: "var(--muted)",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "var(--accent)",
              display: "inline-block",
            }}
          />
          <strong style={{ color: "var(--foreground)" }}>
            CONTROL DESK ACTIVE
          </strong>
        </div>
        <span>Station: CR-ALPHA-01</span>
      </div>
    </aside>
  );
}
