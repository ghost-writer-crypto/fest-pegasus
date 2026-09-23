"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Sports", href: "/sports" },
  { label: "Schedules", href: "/schedules" },
  { label: "Fixtures", href: "/fixtures" },
  { label: "Results", href: "/results" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Participants", href: "/participants" },
  { label: "Teams", href: "/teams" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Suppress public navbar across non-public worlds (Admin, Judge, Team Manager, Display)
  const isNonPublicWorld =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/judge") ||
    pathname.startsWith("/team-manager") ||
    pathname.startsWith("/display");

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsMobileOpen(false);
  }

  // Handle escape key and body scroll locking when mobile drawer is open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileOpen(false);
      }
    };

    if (isMobileOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

  if (isNonPublicWorld) {
    return null;
  }

  return (
    <header className="pegasus-nav">
      <div className="pegasus-nav__inner">
        <Link href="/" className="pegasus-brand" onClick={() => setIsMobileOpen(false)}>
          <span className="pegasus-brand__mark">P</span>
          <span className="pegasus-brand__name">PEGASUS</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="pegasus-nav__links" aria-label="Primary navigation">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`pegasus-nav__link ${
                  active ? "pegasus-nav__link--active" : ""
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop CTA & Mobile Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link href="/my-result" className="pegasus-nav__result">
            <span>My Result</span>
            <span className="pegasus-nav__arrow">↗</span>
          </Link>

          {/* Accessible Mobile Menu Toggle Button */}
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

      {/* Mobile Navigation Drawer Backdrop & Panel */}
      {isMobileOpen && (
        <div
          className="pegasus-nav__drawer-overlay"
          aria-hidden="true"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <div
        id="pegasus-mobile-drawer"
        className={`pegasus-nav__drawer ${isMobileOpen ? "pegasus-nav__drawer--open" : ""}`}
        aria-label="Mobile navigation menu"
        aria-hidden={!isMobileOpen}
      >
        <div className="pegasus-nav__drawer-header">
          <div className="pegasus-brand">
            <span className="pegasus-brand__mark">P</span>
            <span className="pegasus-brand__name">PEGASUS</span>
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
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`pegasus-nav__drawer-link ${
                  active ? "pegasus-nav__drawer-link--active" : ""
                }`}
                onClick={() => setIsMobileOpen(false)}
              >
                <span>{item.label}</span>
                <span className="pegasus-nav__drawer-arrow">→</span>
              </Link>
            );
          })}

          <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #E8EDF3" }}>
            <Link
              href="/my-result"
              className="pegasus-nav__result"
              style={{ width: "100%", justifyContent: "center", minHeight: "44px" }}
              onClick={() => setIsMobileOpen(false)}
            >
              <span>My Result</span>
              <span className="pegasus-nav__arrow">↗</span>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}