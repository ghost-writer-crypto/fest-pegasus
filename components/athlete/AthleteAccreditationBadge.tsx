"use client";

import { useState } from "react";
import { Copy, Check, Printer, ShieldCheck } from "lucide-react";
import styles from "./athletePass.module.css";

export interface HouseTheme {
  name: string;
  code: string;
  gradient: string;
  primaryColor: string;
  icon: string;
  motto: string;
}

interface AthleteAccreditationBadgeProps {
  athlete: {
    id: string;
    publicId: string;
    chestNumber: string | null;
    name: string;
    divisionName: string;
    status: string;
  };
  house: HouseTheme;
  qrSvg: string;
  verificationUrl: string;
}

export default function AthleteAccreditationBadge({
  athlete,
  house,
  qrSvg,
  verificationUrl,
}: AthleteAccreditationBadgeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      const fullUrl = typeof window !== "undefined"
        ? `${window.location.origin}${verificationUrl}`
        : verificationUrl;
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const initials = athlete.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={styles.credentialBadge} id="athlete-credential-badge">
      {/* Lanyard Hole Notch */}
      <div className={styles.lanyardHole} aria-hidden="true" />

      {/* Top House Ribbon */}
      <div
        className={styles.badgeTopRibbon}
        style={{
          background: house.gradient,
        }}
      >
        <span className={styles.festivalStamp}>ZENITHROW 2026</span>
        <span
          style={{
            fontSize: "11px",
            fontFamily: "var(--font-mono, monospace)",
            fontWeight: 900,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#ffffff",
            textShadow: "0 1px 3px rgba(0,0,0,0.6)",
          }}
        >
          {house.code} • HOUSE
        </span>
      </div>

      {/* Badge Main Body */}
      <div className={styles.badgeContent}>
        {/* Chest Number Tag */}
        {athlete.chestNumber && (
          <div className={styles.chestNumberPill}>
            <span className={styles.chestNumberLabel}>CHEST #</span>
            <span className={styles.chestNumberValue}>{athlete.chestNumber}</span>
          </div>
        )}

        {/* Athlete Avatar / Monogram */}
        <div
          className={styles.athleteMonogram}
          style={{
            background: house.primaryColor,
            boxShadow: `0 8px 24px ${house.primaryColor}55`,
          }}
        >
          {initials}
        </div>

        {/* Name & House */}
        <h2 className={styles.athleteName}>{athlete.name}</h2>

        <div className={styles.athleteAffiliation}>
          <span className={styles.houseTag} style={{ color: house.primaryColor }}>
            <span>{house.icon}</span> {house.name}
          </span>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>•</span>
          <span className={styles.divisionTag}>{athlete.divisionName}</span>
        </div>

        {/* Verified Status Pill */}
        <div className={styles.accreditationStatusBadge}>
          <span className={styles.statusDot} />
          <span>OFFICIAL ACCREDITATION ACTIVE</span>
        </div>

        {/* Scannable SVG QR Code */}
        <div
          className={styles.qrContainer}
          dangerouslySetInnerHTML={{ __html: qrSvg }}
          aria-label={`Official QR code for ${athlete.name}`}
        />

        <p className={styles.qrNotice}>
          SCAN TO VERIFY WITH MARSHAL DESK
        </p>

        {/* Quick Action Buttons */}
        <div className={styles.badgeActions}>
          <button
            type="button"
            onClick={handleCopyLink}
            className={styles.passActionButton}
            aria-label="Copy accreditation link"
          >
            {copied ? (
              <>
                <Check size={14} style={{ color: "#10b981" }} />
                <span>LINK COPIED</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>COPY PASS LINK</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className={styles.passActionButton}
            aria-label="Print digital accreditation card"
          >
            <Printer size={14} />
            <span>PRINT PASS</span>
          </button>
        </div>
      </div>

      {/* Security Signature Footer */}
      <div className={styles.badgeFooterSecurity}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
          <ShieldCheck size={12} style={{ color: "#38bdf8" }} />
          <span>OFFICIAL ATHLETIC COMMISSION • {athlete.publicId}</span>
        </div>
      </div>
    </div>
  );
}
