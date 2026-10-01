"use client";

import React, { useEffect, useCallback } from "react";
import { generateQrSvgString } from "@/lib/qr/qrMatrix";

export interface ProfileQrData {
  name: string;
  role: string;
  roleLabel: string;
  identifier?: string;
  subIdentifier?: string;
  qrUrl: string;
  isPrivileged?: boolean;
}

interface ProfileQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ProfileQrData;
}

export default function ProfileQrModal({
  isOpen,
  onClose,
  data,
}: ProfileQrModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const qrSvg = generateQrSvgString(data.qrUrl, {
    size: 260,
    margin: 3,
    darkColor: "#09090b",
    lightColor: "#ffffff",
  });

  return (
    <div
      className="pegasus-modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.82)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pegasus-qr-title"
    >
      <div
        className="pegasus-card pegasus-animate-fade"
        style={{
          width: "100%",
          maxWidth: "380px",
          background: "#121214",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "16px",
          padding: "24px 20px 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)",
          boxSizing: "border-box",
        }}
      >
        {/* Eyebrow / Security Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            padding: "3px 10px",
            borderRadius: "999px",
            marginBottom: "12px",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: data.isPrivileged ? "var(--status-live)" : "var(--accent)",
              display: "inline-block",
            }}
          />
          <span
            style={{
              fontSize: "10px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--muted)",
            }}
          >
            ZENITHROW IDENTITY
          </span>
        </div>

        {/* Person's Name */}
        <h2
          id="pegasus-qr-title"
          style={{
            margin: "0 0 4px",
            fontSize: "20px",
            fontWeight: 850,
            letterSpacing: "-0.02em",
            color: "var(--foreground)",
          }}
        >
          {data.name}
        </h2>

        {/* Role and Identifier */}
        <p
          style={{
            margin: "0 0 2px",
            fontSize: "13px",
            fontWeight: 650,
            color: data.isPrivileged ? "var(--accent)" : "var(--foreground)",
          }}
        >
          {data.roleLabel}
        </p>

        {(data.identifier || data.subIdentifier) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontSize: "11px",
              fontFamily: "monospace",
              color: "var(--muted)",
              marginBottom: "16px",
            }}
          >
            {data.identifier && <span>{data.identifier}</span>}
            {data.identifier && data.subIdentifier && <span>•</span>}
            {data.subIdentifier && <span>{data.subIdentifier}</span>}
          </div>
        )}

        {/* High-Contrast Large QR Container */}
        <div
          style={{
            background: "#ffffff",
            padding: "12px",
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "14px",
            width: "260px",
            height: "260px",
            boxSizing: "border-box",
          }}
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />

        {/* Security Footer Notice */}
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--muted)",
            marginBottom: "6px",
          }}
        >
          ZENITHROW ID QR
        </span>

        {data.isPrivileged ? (
          <p
            style={{
              margin: "0 0 16px",
              fontSize: "11px",
              color: "var(--muted)",
              lineHeight: 1.4,
              maxWidth: "280px",
            }}
          >
            Official identity token. Scanned QR confirms identity only and does not grant portal access without login.
          </p>
        ) : (
          <p
            style={{
              margin: "0 0 16px",
              fontSize: "11px",
              color: "var(--muted)",
              lineHeight: 1.4,
              maxWidth: "280px",
            }}
          >
            Scan to open verified official competitor profile and outing records.
          </p>
        )}

        {/* Close Action */}
        <button
          type="button"
          onClick={onClose}
          className="pegasus-button pegasus-button--secondary"
          style={{
            width: "100%",
            fontSize: "13px",
            fontWeight: 700,
            padding: "10px",
            minHeight: "40px",
            borderRadius: "8px",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
