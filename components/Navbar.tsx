"use client";

import { useState, useEffect } from "react";
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
  { label: "Results", href: "/results" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Teams", href: "/teams" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Smooth scroll listener for transparent-to-frosted glass transition
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
  }

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (isOperationalWorld) {
    return null;
  }

  return (
    <nav className={`nav ${isScrolled ? "scrolled" : ""}`} aria-label="Main Navigation">
      <div className="nav-container">
        {/* Brand */}
        <Link href="/" className="brand" aria-label="ZENITHROW Home">
          ZENITHROW<span style={{ color: "var(--primary)", marginLeft: "1px" }}>.</span>
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

          {/* Mobile Destinations */}
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
              <Link
                href="/my-result"
                onClick={() => setIsMobileOpen(false)}
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#fff",
                  padding: "8px 0",
                  textDecoration: "none",
                }}
              >
                My ZENITHROW
              </Link>
              <Link
                href="/admin"
                onClick={() => setIsMobileOpen(false)}
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--muted)",
                  padding: "8px 0",
                  textDecoration: "none",
                }}
              >
                Admin Panel
              </Link>
            </div>
          )}
        </div>

        {/* Right Side Action Cluster: Two Primary Destinations + Mobile Toggle */}
        <div className="nav-actions">
          {/* My ZENITHROW Action Pill */}
          <Link
            href="/my-result"
            className="pill nav-my-zenith"
            style={{
              textDecoration: "none",
              border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
              minHeight: "38px",
              borderRadius: "var(--radius-full, 9999px)",
              padding: "0 16px",
              fontSize: "13px",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              background: "rgba(255, 255, 255, 0.04)",
              transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            My ZENITHROW
          </Link>

          {/* Admin Panel Action Pill */}
          <Link
            href="/admin"
            className="pill nav-admin-pill"
            style={{
              textDecoration: "none",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              minHeight: "38px",
              borderRadius: "var(--radius-full, 9999px)",
              padding: "0 16px",
              fontSize: "13px",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--muted)",
              background: "transparent",
              transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            Admin Panel
          </Link>

          {/* Mobile Toggle Button */}
          <button
            type="button"
            className="mobile-toggle"
            onClick={() => setIsMobileOpen((prev) => !prev)}
            aria-label={isMobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileOpen}
            style={{
              minWidth: "38px",
              minHeight: "38px",
              borderRadius: "var(--radius-sm, 12px)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            {isMobileOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>
    </nav>
  );
}
