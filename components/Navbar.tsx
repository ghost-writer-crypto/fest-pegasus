"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  label: string;
  href: string;
}

const NAV_LINKS: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Sports", href: "/sports" },
  { label: "Schedule", href: "/schedules" },
  { label: "Live", href: "/display" },
  { label: "Results", href: "/results" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Teams", href: "/teams" },
];

const PORTAL_LINKS = [
  {
    role: "Athlete",
    title: "My ZENITHROW",
    desc: "Personal competition telemetry, chest number & verified results",
    href: "/my-result",
    tag: "ATHLETE",
  },
  {
    role: "House Command",
    title: "Team Manager",
    desc: "Squad roster, entry quotas, substitutions & appeals",
    href: "/team-manager",
    tag: "MANAGER",
  },
  {
    role: "Judge Desk",
    title: "Referee Field Desk",
    desc: "Scorecard entry, finish times, heats verification",
    href: "/judge",
    tag: "OFFICIAL",
  },
  {
    role: "Festival Command",
    title: "Admin Command Center",
    desc: "Tournament control, dispute adjudication & publication",
    href: "/admin",
    tag: "OPS/ADMIN",
  },
  {
    role: "Official Terminal",
    title: "Operator Login",
    desc: "Staff access key sign-in & station credentials",
    href: "/login",
    tag: "LOGIN",
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isPortalOpen, setIsPortalOpen] = useState(false);
  const portalRef = useRef<HTMLDivElement>(null);

  // Suppress public navbar across operational workspace shells
  const isOperationalWorld =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/judge") ||
    pathname.startsWith("/team-manager") ||
    pathname.startsWith("/display");

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsMobileOpen(false);
    setIsPortalOpen(false);
  }

  // Handle escape key and click outside for portal popup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileOpen(false);
        setIsPortalOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (portalRef.current && !portalRef.current.contains(e.target as Node)) {
        setIsPortalOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (isOperationalWorld) {
    return null;
  }

  return (
    <nav className="nav" aria-label="Main Navigation">
      {/* Brand */}
      <Link href="/" className="brand" aria-label="Hamdan Students Union Home">
        HSU<span style={{ color: "var(--hsu-red)", marginLeft: "1px" }}>.</span>
      </Link>

      {/* Navlinks */}
      <div className={`navlinks ${isMobileOpen ? "open" : ""}`}>
        {NAV_LINKS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.label}
              href={item.href}
              className={isActive ? "active" : ""}
              onClick={() => setIsMobileOpen(false)}
            >
              {item.label}
            </Link>
          );
        })}

        {/* Mobile Portal List */}
        {isMobileOpen && (
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.12)",
              paddingTop: "12px",
              marginTop: "8px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ fontSize: "10px", color: "var(--hsu-red2)", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              Operational Portals
            </div>
            {PORTAL_LINKS.map((portal) => (
              <Link
                key={portal.title}
                href={portal.href}
                onClick={() => setIsMobileOpen(false)}
                style={{
                  fontSize: "12px",
                  color: "#ddd",
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 0",
                }}
              >
                <span>{portal.title}</span>
                <span style={{ fontSize: "10px", color: "var(--hsu-muted)" }}>{portal.tag}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Portal Trigger Pill */}
      <div ref={portalRef} style={{ position: "relative", marginLeft: "auto" }}>
        <button
          type="button"
          className="pill"
          onClick={() => setIsPortalOpen((prev) => !prev)}
          aria-expanded={isPortalOpen}
          aria-haspopup="true"
          style={{
            cursor: "pointer",
            border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
            minHeight: "44px",
            borderRadius: "var(--radius-full, 9999px)",
            padding: "0 20px",
            fontSize: "13px",
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = "scale(0.98)";
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = "none";
          }}
        >
          My ZENITHROW
        </button>

        {/* Portal Dropdown Menu */}
        {isPortalOpen && (
          <div
            className="pegasus-portal-menu"
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 14px)",
              width: "330px",
              background: "rgba(18, 18, 20, 0.88)",
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "var(--radius-lg, 24px)",
                overflow: "hidden",
              padding: "16px",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.06)",
              zIndex: 50,
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ padding: "0 4px 10px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <div className="kicker" style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--hsu-muted)" }}>
                Festival Command & Desks
              </div>
              <strong style={{ fontSize: "14px", fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>
                Operational Portals
              </strong>
            </div>

            {PORTAL_LINKS.map((portal) => (
              <Link
                key={portal.title}
                href={portal.href}
                onClick={() => setIsPortalOpen(false)}
                style={{
                  padding: "12px 14px",
                  borderRadius: "var(--radius-sm, 12px)",
                        background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  textDecoration: "none",
                  display: "block",
                  transition: "background 0.2s ease, border-color 0.2s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.16)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.transform = "none";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: "13px", fontWeight: 650, color: "#fff" }}>{portal.title}</strong>
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                      color: "var(--hsu-red2)",
                      background: "rgba(239, 61, 50, 0.12)",
                      border: "1px solid rgba(239, 61, 50, 0.25)",
                      padding: "3px 7px",
                      borderRadius: "var(--radius-xs, 8px)",
                              }}
                  >
                    {portal.tag}
                  </span>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--hsu-muted)", lineHeight: 1.4 }}>
                  {portal.desc}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Mobile Toggle Button */}
      <button
        type="button"
        className="mobile-toggle"
        onClick={() => setIsMobileOpen((prev) => !prev)}
        aria-label={isMobileOpen ? "Close menu" : "Open menu"}
        aria-expanded={isMobileOpen}
        style={{
          minWidth: "44px",
          minHeight: "44px",
          borderRadius: "var(--radius-sm, 12px)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isMobileOpen ? "✕" : "☰"}
      </button>
    </nav>
  );
}
