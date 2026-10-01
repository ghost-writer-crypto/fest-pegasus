"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/theme/ThemeToggle";

export interface NavItem {
  label: string;
  href: string;
  isLive?: boolean;
}

const navItems: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Sports", href: "/sports" },
  { label: "Schedule", href: "/schedules" },
  { label: "Live", href: "/#live-strip", isLive: true },
  { label: "Results", href: "/results" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Teams", href: "/teams" },
];

const portals = [
  {
    role: "Participant",
    title: "My ZENITHROW",
    desc: "Athlete identity, chest number, personal results & poster",
    href: "/my-result",
    tag: "ATHLETE",
  },
  {
    role: "Team Manager",
    title: "House Command",
    desc: "Squad roster, entry quotas, substitutions & appeals",
    href: "/team-manager",
    tag: "MANAGER",
  },
  {
    role: "Judge",
    title: "Referee Field Desk",
    desc: "Assigned heats, scorecards, finish times & verifications",
    href: "/judge",
    tag: "OFFICIAL",
  },
  {
    role: "Admin",
    title: "Festival Command",
    desc: "Tournament control, dispute adjudication & publication",
    href: "/admin",
    tag: "CONTROL",
  },
  {
    role: "Login",
    title: "Operator Login",
    desc: "Official access key sign-in & station credentials",
    href: "/login",
    tag: "AUTH",
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isPortalOpen, setIsPortalOpen] = useState(false);
  const portalRef = useRef<HTMLDivElement>(null);

  // Suppress public navbar across operational shells
  const isNonPublicWorld =
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

  // Handle escape key and click outside for portal menu
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

    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

  if (isNonPublicWorld) {
    return null;
  }

  return (
    <header className="pegasus-nav" role="banner">
      <div className="pegasus-nav__inner">
        {/* Brand Anchor */}
        <Link
          href="/"
          className="pegasus-brand"
          onClick={() => {
            setIsMobileOpen(false);
            setIsPortalOpen(false);
          }}
          aria-label="ZENITHROW Sports Festival Home"
        >
          <span className="pegasus-brand__mark" aria-hidden="true">Z</span>
          <span className="pegasus-brand__name">ZENITHROW</span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="pegasus-nav__links" aria-label="Primary festival navigation">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : item.href.startsWith("/#")
                ? false
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`pegasus-nav__link ${active ? "pegasus-nav__link--active" : ""}`}
                style={{ position: "relative" }}
              >
                <span>{item.label}</span>
                {item.isLive && (
                  <span
                    style={{
                      display: "inline-block",
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: "var(--primary)",
                      marginLeft: "6px",
                      verticalAlign: "middle",
                      boxShadow: "0 0 8px rgba(229, 57, 53, 0.8)",
                      animation: "pegasus-pulse 1.8s infinite",
                    }}
                    aria-label="Live event in progress"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Utility: Theme Toggle, Portals Menu & My ZENITHROW CTA */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Light / Dark Mode Toggle */}
          <ThemeToggle />

          {/* Role-based Portals Switcher */}
          <div ref={portalRef} style={{ position: "relative" }}>
            <button
              type="button"
              className="pegasus-button pegasus-button--subtle"
              style={{
                fontSize: "11px",
                padding: "6px 12px",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: isPortalOpen ? "var(--surface-raised)" : "transparent",
                borderColor: isPortalOpen ? "var(--border-strong)" : "var(--border)",
                color: "var(--text-primary)",
              }}
              onClick={() => setIsPortalOpen((prev) => !prev)}
              aria-expanded={isPortalOpen}
              aria-haspopup="true"
              aria-label="Toggle role portals menu"
            >
              <span>Portals</span>
              <span style={{ fontSize: "9px", opacity: 0.7 }} aria-hidden="true">
                {isPortalOpen ? "▲" : "▼"}
              </span>
            </button>

            {/* Portal Dropdown Menu */}
            {isPortalOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  width: "290px",
                  background: "var(--surface-1)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--zenith-highlight), var(--zenith-shadow-lg)",
                  padding: "10px",
                  zIndex: 1000,
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
                role="menu"
                aria-label="Operational role entry points"
              >
                <div
                  style={{
                    padding: "4px 8px 8px",
                    borderBottom: "1px solid var(--border)",
                    marginBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                      fontSize: "10px",
                      fontWeight: 800,
                      letterSpacing: "0.14em",
                      color: "var(--text-secondary)",
                      textTransform: "uppercase",
                    }}
                  >
                    ENTRY POINTS // ROLES
                  </span>
                </div>

                {portals.map((p) => (
                  <Link
                    key={p.role}
                    href={p.href}
                    onClick={() => setIsPortalOpen(false)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: "var(--radius-micro, 6px)",
                      textDecoration: "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                      transition: "background 120ms ease",
                      border: "1px solid transparent",
                    }}
                    className="pegasus-portal-item"
                    role="menuitem"
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "13px", fontWeight: 750, color: "var(--text-primary)" }}>
                        {p.title}
                      </span>
                      <span
                        style={{
                          fontSize: "9px",
                          fontFamily: "ui-monospace, monospace",
                          fontWeight: 800,
                          padding: "2px 5px",
                          background: "var(--surface-raised)",
                          color: "var(--text-primary)",
                          borderRadius: "var(--radius-micro, 6px)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        {p.tag}
                      </span>
                    </div>
                    <span style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.3 }}>
                      {p.desc}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Primary Action: My ZENITHROW */}
          <Link href="/my-result" className="pegasus-nav__result">
            <span>My ZENITHROW</span>
            <span className="pegasus-nav__arrow" aria-hidden="true">↗</span>
          </Link>

          {/* Accessible Mobile Menu Toggle */}
          <button
            type="button"
            className="pegasus-nav__toggle"
            aria-expanded={isMobileOpen}
            aria-controls="pegasus-mobile-drawer"
            aria-label={isMobileOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setIsMobileOpen((prev) => !prev)}
          >
            <span className="pegasus-nav__toggle-icon" aria-hidden="true">
              {isMobileOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </svg>
              )}
            </span>
          </button>
        </div>
      </div>


      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          className="pegasus-nav__drawer-overlay"
          aria-hidden="true"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Navigation Drawer */}
      <div
        id="pegasus-mobile-drawer"
        className={`pegasus-nav__drawer ${isMobileOpen ? "pegasus-nav__drawer--open" : ""}`}
        aria-label="Mobile festival navigation"
        aria-hidden={!isMobileOpen}
      >
        <div className="pegasus-nav__drawer-header">
          <div className="pegasus-brand">
            <span className="pegasus-brand__mark">Z</span>
            <span className="pegasus-brand__name">ZENITHROW</span>
          </div>
          <button
            type="button"
            className="pegasus-nav__drawer-close"
            aria-label="Close navigation menu"
            onClick={() => setIsMobileOpen(false)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className="pegasus-nav__drawer-nav">
          <p
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: "10px",
              fontWeight: 800,
              letterSpacing: "0.14em",
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              padding: "0 12px 4px",
              margin: 0,
            }}
          >
            FESTIVAL NAVIGATION
          </p>

          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : item.href.startsWith("/#")
                ? false
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`pegasus-nav__drawer-link ${active ? "pegasus-nav__drawer-link--active" : ""}`}
                onClick={() => setIsMobileOpen(false)}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>{item.label}</span>
                  {item.isLive && (
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 800,
                        backgroundColor: "var(--primary)",
                        color: "#FFFFFF",
                        padding: "1px 5px",
                        borderRadius: "2px",
                        fontFamily: "ui-monospace, monospace",
                      }}
                    >
                      LIVE
                    </span>
                  )}
                </span>
                <span className="pegasus-nav__drawer-arrow" aria-hidden="true">→</span>
              </Link>
            );
          })}

          {/* Quick Athlete Entry */}
          <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
            <Link
              href="/my-result"
              className="pegasus-button pegasus-button--primary"
              style={{ width: "100%", justifyContent: "center", minHeight: "44px", textDecoration: "none" }}
              onClick={() => setIsMobileOpen(false)}
            >
              <span>My ZENITHROW</span>
              <span className="pegasus-nav__arrow" aria-hidden="true">↗</span>
            </Link>
          </div>

          {/* Role Portals Group in Mobile Drawer */}
          <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
            <p
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: "0.14em",
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                padding: "0 12px 8px",
                margin: 0,
              }}
            >
              ROLE ENTRY POINTS
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", padding: "0 12px" }}>
              <Link
                href="/team-manager"
                onClick={() => setIsMobileOpen(false)}
                style={{
                  padding: "8px",
                  border: "1px solid var(--border)",
                  borderRadius: "3px",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  textDecoration: "none",
                  textAlign: "center",
                  background: "var(--surface-raised)",
                }}
              >
                Team Manager
              </Link>
              <Link
                href="/judge"
                onClick={() => setIsMobileOpen(false)}
                style={{
                  padding: "8px",
                  border: "1px solid var(--border)",
                  borderRadius: "3px",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  textDecoration: "none",
                  textAlign: "center",
                  background: "var(--surface-raised)",
                }}
              >
                Judge Desk
              </Link>
              <Link
                href="/admin"
                onClick={() => setIsMobileOpen(false)}
                style={{
                  gridColumn: "span 2",
                  padding: "8px",
                  border: "1px solid var(--border-strong)",
                  borderRadius: "3px",
                  fontSize: "12px",
                  fontWeight: 750,
                  color: "var(--text-primary)",
                  textDecoration: "none",
                  textAlign: "center",
                  background: "var(--surface)",
                }}
              >
                Admin Command Center
              </Link>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}

