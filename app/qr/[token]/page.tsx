import Link from "next/link";
import type { Metadata } from "next";
import { resolveQrToken } from "@/lib/repositories/qrRepository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Identity Verification | Pegasus QR",
  description: "Official PEGASUS identity verification and authentication portal",
};

interface QrResolutionPageProps {
  params: Promise<{ token: string }>;
}

export default async function QrResolutionPage({
  params,
}: QrResolutionPageProps) {
  const { token } = await params;

  // Server-side identity resolution
  const result = await resolveQrToken(token);

  if (!result.valid) {
    return (
      <main className="pegasus-page pegasus-animate-fade" style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div
          className="pegasus-card"
          style={{
            maxWidth: "460px",
            width: "100%",
            padding: "36px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "14px",
            background: "#121214",
            border: "1px solid rgba(239, 68, 68, 0.3)",
          }}
        >
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              color: "var(--status-dns)",
            }}
          >
            ⚠
          </div>

          <div>
            <p className="pegasus-eyebrow" style={{ color: "var(--status-dns)", margin: "0 0 4px" }}>
              SECURITY VERIFICATION FAILED
            </p>
            <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800 }}>
              Invalid or Revoked QR Code
            </h1>
          </div>

          <p style={{ margin: 0, fontSize: "14px", color: "var(--muted)", lineHeight: 1.5 }}>
            {result.error}
          </p>

          <Link
            href="/"
            className="pegasus-button pegasus-button--secondary"
            style={{ marginTop: "12px", width: "100%", justifyContent: "center" }}
          >
            Return to Public Portal
          </Link>
        </div>
      </main>
    );
  }

  // 1. Student Identity View
  if (result.entityType === "participant") {
    const { student } = result;

    return (
      <main className="pegasus-page pegasus-animate-fade" style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div
          className="pegasus-card"
          style={{
            maxWidth: "480px",
            width: "100%",
            padding: "32px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
            background: "#121214",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "16px",
          }}
        >
          {/* Verified Header Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              padding: "4px 12px",
              borderRadius: "999px",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "var(--status-live)",
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--status-live)",
              }}
            >
              OFFICIAL ATHLETE VERIFIED
            </span>
          </div>

          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                marginBottom: "4px",
              }}
            >
              {student.chestNumber && (
                <span className="pegasus-chest-badge">
                  CHEST #{student.chestNumber}
                </span>
              )}
              <span style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--muted)" }}>
                {student.publicId}
              </span>
            </div>

            <h1 style={{ margin: "4px 0 0", fontSize: "26px", fontWeight: 850 }}>
              {student.name}
            </h1>
          </div>

          {/* Student Meta Details */}
          <div
            style={{
              width: "100%",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "14px 16px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
              textAlign: "left",
            }}
          >
            <div>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
                Team / House
              </span>
              <p style={{ margin: "2px 0 0", fontSize: "14px", fontWeight: 750, color: "var(--foreground)" }}>
                {student.teamName ?? "Unassigned"}
              </p>
            </div>

            <div>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
                Academic Division
              </span>
              <p style={{ margin: "2px 0 0", fontSize: "14px", fontWeight: 750, color: "var(--foreground)" }}>
                {student.divisionName ?? "Open"}
              </p>
            </div>

            <div>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
                Status
              </span>
              <p style={{ margin: "2px 0 0", fontSize: "13px", fontWeight: 700, color: "var(--status-live)" }}>
                {student.status.toUpperCase()}
              </p>
            </div>

            <div>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
                Verified At
              </span>
              <p style={{ margin: "2px 0 0", fontSize: "11px", fontFamily: "monospace", color: "var(--muted)" }}>
                {new Date(result.verifiedAt).toLocaleTimeString()}
              </p>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: "12px", color: "var(--muted)", lineHeight: 1.4 }}>
            Official competitor identity verified via PEGASUS Security Token. Student profile and results are read-only.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%", marginTop: "4px" }}>
            <Link
              href={result.redirectUrl}
              className="pegasus-button pegasus-button--primary"
              style={{ width: "100%", justifyContent: "center" }}
            >
              View Full Athlete Profile & Outings <span>↗</span>
            </Link>
            <Link
              href={`/my-result?q=${encodeURIComponent(student.publicId)}`}
              className="pegasus-button pegasus-button--secondary"
              style={{ width: "100%", justifyContent: "center" }}
            >
              Check My Result <span>↗</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // 2. Privileged Role Identity View (Judge / Admin / Team Manager / Desk Operator)
  const { profile } = result;

  return (
    <main className="pegasus-page pegasus-animate-fade" style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div
        className="pegasus-card"
        style={{
          maxWidth: "480px",
          width: "100%",
          padding: "32px 24px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
          background: "#121214",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "16px",
        }}
      >
        {/* Verified Official Header Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(215, 255, 63, 0.12)",
            border: "1px solid rgba(215, 255, 63, 0.3)",
            padding: "4px 12px",
            borderRadius: "999px",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "var(--accent)",
              display: "inline-block",
            }}
          />
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--accent)",
            }}
          >
            OFFICIAL IDENTITY VERIFIED
          </span>
        </div>

        <div>
          <span style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
            {profile.identifier}
          </span>
          <h1 style={{ margin: "0 0 4px", fontSize: "26px", fontWeight: 850 }}>
            {profile.fullName}
          </h1>
          <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--accent)" }}>
            {profile.roleTitle}
          </p>
        </div>

        {/* Security Warning Notice */}
        <div
          style={{
            width: "100%",
            background: "rgba(255, 170, 0, 0.08)",
            border: "1px solid rgba(255, 170, 0, 0.25)",
            borderRadius: "10px",
            padding: "14px 16px",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ color: "var(--status-pending)" }}>🔒</span>
            <strong style={{ fontSize: "12px", color: "var(--foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Authentication Required
            </strong>
          </div>
          <p style={{ margin: 0, fontSize: "12px", color: "var(--muted)", lineHeight: 1.5 }}>
            Scanning this QR code verifies official identity. Privileged actions (scoring, verification, admin control) require direct portal login.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%", marginTop: "6px" }}>
          <Link
            href={result.redirectUrl}
            className="pegasus-button pegasus-button--primary"
            style={{ width: "100%", justifyContent: "center" }}
          >
            Access Official Portal ({profile.roleTitle}) <span>↗</span>
          </Link>
          <Link
            href="/"
            className="pegasus-button pegasus-button--subtle"
            style={{ width: "100%", justifyContent: "center" }}
          >
            Return to Public Portal
          </Link>
        </div>
      </div>
    </main>
  );
}
