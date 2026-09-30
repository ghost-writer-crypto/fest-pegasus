"use client";

import React, { useState } from "react";
import ProfileQrModal, { type ProfileQrData } from "./ProfileQrModal";

interface ShowQrButtonProps {
  data: ProfileQrData;
  label?: string;
  variant?: "primary" | "secondary" | "subtle";
  style?: React.CSSProperties;
  className?: string;
}

export default function ShowQrButton({
  data,
  label = "Show QR Code",
  variant = "secondary",
  style,
  className,
}: ShowQrButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const buttonClass =
    variant === "primary"
      ? "pegasus-button pegasus-button--primary"
      : variant === "subtle"
        ? "pegasus-button pegasus-button--subtle"
        : "pegasus-button pegasus-button--secondary";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`${buttonClass} ${className ?? ""}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "13px",
          minHeight: "38px",
          ...style,
        }}
        aria-label={`Show QR Code for ${data.name}`}
      >
        <span
          style={{
            fontSize: "14px",
            lineHeight: 1,
            display: "inline-flex",
            alignItems: "center",
          }}
          aria-hidden="true"
        >
          ⊞
        </span>
        <span>{label}</span>
      </button>

      <ProfileQrModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        data={data}
      />
    </>
  );
}
