"use client";

import { useTheme } from "./ThemeProvider";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        className="zenith-theme-toggle"
        aria-label="Toggle light/dark theme"
        style={{
          width: "32px",
          height: "32px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "3px",
          border: "1px solid var(--border)",
          background: "transparent",
          cursor: "pointer",
          color: "var(--text-primary)",
        }}
      >
        <span style={{ fontSize: "14px", lineHeight: 1 }}>◑</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className="zenith-theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
      title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
      style={{
        width: "32px",
        height: "32px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "3px",
        border: "1px solid var(--border)",
        background: "transparent",
        cursor: "pointer",
        color: "var(--text-primary)",
        transition: "border-color 140ms ease, background 140ms ease",
      }}
    >
      <span style={{ fontSize: "14px", lineHeight: 1 }}>
        {theme === "light" ? "🌙" : "☀️"}
      </span>
    </button>
  );
}
