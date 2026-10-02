"use client";

import React from "react";

/**
 * ZenithrowAdminTheme
 * Injects the unified dark-mode glassmorphic design system tokens,
 * typography, and layout rules for the ZENITHROW 2026 Admin Control Room.
 */
export default function ZenithrowAdminTheme() {
  return (
    <style>{`
      /* ======================================================== */
      /* ZENITHROW 2026 ADMIN UNIFIED DESIGN SYSTEM               */
      /* ======================================================== */
      :root {
        --ztr-obsidian: #070809;
        --ztr-surface-0: #0b0c0e;
        --ztr-surface-1: #101216;
        --ztr-surface-2: #161920;
        --ztr-surface-3: #1c2028;
        --ztr-border: rgba(255, 255, 255, 0.08);
        --ztr-border-hover: rgba(255, 255, 255, 0.16);
        --ztr-border-focus: rgba(229, 57, 53, 0.6);
        --ztr-fg: #f8fafc;
        --ztr-muted: #94a3b8;
        --ztr-muted-dim: #64748b;
        --ztr-crimson: #e53935;
        --ztr-crimson-hover: #ff5252;
        --ztr-crimson-glow: rgba(229, 57, 53, 0.22);
        --ztr-success: #10b981;
        --ztr-warning: #f59e0b;
        --ztr-blue: #2563eb;
      }

      /* Baseline shell container */
      .pegasus-admin-shell {
        background-color: var(--ztr-obsidian) !important;
        background-image: 
          radial-gradient(circle at 50% 0%, rgba(229, 57, 53, 0.04) 0%, transparent 60%),
          linear-gradient(180deg, #090a0d 0%, #070809 100%) !important;
        color: var(--ztr-fg) !important;
        font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        min-height: 100vh;
      }

      /* Admin Sidebar */
      .pegasus-admin-sidebar {
        background: rgba(11, 12, 14, 0.95) !important;
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-right: 1px solid var(--ztr-border) !important;
      }

      .pegasus-admin-sidebar .pegasus-admin-nav-item {
        border-radius: 8px;
        transition: all 0.16s ease;
        color: var(--ztr-muted);
      }

      .pegasus-admin-sidebar .pegasus-admin-nav-item:hover:not(.pegasus-admin-nav-item--disabled) {
        background: rgba(255, 255, 255, 0.05) !important;
        color: var(--ztr-fg) !important;
        transform: translateX(2px);
      }

      .pegasus-admin-sidebar .pegasus-admin-nav-item--active {
        background: rgba(229, 57, 53, 0.12) !important;
        color: #fff !important;
        border-left: 3px solid var(--ztr-crimson) !important;
      }

      /* Admin Topbar */
      .pegasus-admin-topbar {
        background: rgba(11, 12, 14, 0.85) !important;
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border-bottom: 1px solid var(--ztr-border) !important;
      }

      /* Admin Cards */
      .pegasus-card {
        background: rgba(18, 20, 24, 0.72) !important;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid var(--ztr-border) !important;
        border-radius: 12px;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
      }

      .pegasus-card:hover {
        border-color: var(--ztr-border-hover) !important;
      }

      /* Inputs and Selects */
      .pegasus-admin-input,
      .pegasus-admin-select {
        background: #121418 !important;
        border: 1px solid var(--ztr-border) !important;
        color: var(--ztr-fg) !important;
        border-radius: 8px !important;
        transition: border-color 0.18s ease, box-shadow 0.18s ease;
      }

      .pegasus-admin-input:focus,
      .pegasus-admin-select:focus {
        border-color: var(--ztr-border-focus) !important;
        box-shadow: 0 0 0 3px rgba(229, 57, 53, 0.18) !important;
        outline: none !important;
      }

      /* Primary Button */
      .pegasus-button--primary {
        background: linear-gradient(135deg, #e53935 0%, #d32f2f 100%) !important;
        color: #ffffff !important;
        border: 1px solid rgba(255, 255, 255, 0.15) !important;
        border-radius: 8px !important;
        font-weight: 700 !important;
        box-shadow: 0 2px 10px rgba(229, 57, 53, 0.28) !important;
        transition: all 0.18s ease !important;
      }

      .pegasus-button--primary:hover:not(:disabled) {
        background: linear-gradient(135deg, #ff5252 0%, #e53935 100%) !important;
        box-shadow: 0 4px 16px rgba(229, 57, 53, 0.42) !important;
        transform: translateY(-1px);
      }

      .pegasus-button--primary:active:not(:disabled) {
        transform: translateY(0);
      }

      /* Subtle Button */
      .pegasus-button--subtle {
        background: rgba(255, 255, 255, 0.04) !important;
        border: 1px solid var(--ztr-border) !important;
        color: var(--ztr-fg) !important;
        border-radius: 8px !important;
        transition: all 0.18s ease !important;
      }

      .pegasus-button--subtle:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.09) !important;
        border-color: var(--ztr-border-hover) !important;
      }

      /* Eyebrow kicker */
      .pegasus-eyebrow {
        font-size: 11px !important;
        font-weight: 800 !important;
        letter-spacing: 0.08em !important;
        text-transform: uppercase !important;
        color: var(--ztr-crimson) !important;
      }

      /* Admin tables */
      .pegasus-admin-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
      }

      .pegasus-admin-table th {
        background: rgba(14, 16, 20, 0.95);
        color: var(--ztr-muted);
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 12px 16px;
        border-bottom: 1px solid var(--ztr-border);
      }

      .pegasus-admin-table td {
        padding: 14px 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        transition: background 0.15s ease;
      }

      .pegasus-admin-table tr:hover td {
        background: rgba(255, 255, 255, 0.02);
      }

      /* Custom sleek scrollbars */
      .pegasus-admin-shell ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }

      .pegasus-admin-shell ::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.2);
      }

      .pegasus-admin-shell ::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.12);
        border-radius: 3px;
      }

      .pegasus-admin-shell ::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.24);
      }
    `}</style>
  );
}
