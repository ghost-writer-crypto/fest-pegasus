import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedProfile, getOrCreateQrIdentity } from "@/lib/repositories";
import { logoutAction } from "@/app/login/actions";
import ShowQrButton from "@/components/qr/ShowQrButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pegasus Judge — Field Operations Console",
  description: "Field scoring and referee console for Pegasus Sports Festival",
};

export default async function JudgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getAuthenticatedProfile();

  if (!profile || (profile.role !== "judge" && profile.role !== "admin") || !profile.isActive) {
    redirect("/login?redirect=/judge&error=unauthorized_judge");
  }

  const qrIdentity = await getOrCreateQrIdentity("profile", profile.userId);

  return (
    <div className="pegasus-judge-shell">
      <header className="pegasus-judge-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
          <Link href="/judge" className="pegasus-brand">
            <span className="pegasus-brand__mark">P</span>
            <span className="pegasus-brand__name">PEGASUS</span>
          </Link>
          <span
            style={{
              height: "16px",
              width: "1px",
              background: "var(--border)",
              display: "inline-block",
            }}
          />
          <div>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--accent)",
                display: "block",
              }}
            >
              FIELD OPERATIONS
            </span>
            <span style={{ fontSize: "13px", fontWeight: 750, color: "var(--foreground)" }}>
              Referee Console
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* Referee Identity Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              padding: "4px 10px",
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--foreground)" }}>
              {profile.fullName}
            </span>
            <span
              style={{
                fontSize: "9px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                background: "rgba(56, 189, 248, 0.15)",
                color: "#38bdf8",
                padding: "2px 6px",
                borderRadius: "2px",
              }}
            >
              {profile.role.toUpperCase()}
            </span>
          </div>

          {/* Show Judge QR Button */}
          {qrIdentity && (
            <ShowQrButton
              data={{
                name: profile.fullName,
                role: "judge",
                roleLabel: "Field Referee",
                identifier: `OFFICIAL ID: J-${profile.userId.slice(0, 6).toUpperCase()}`,
                qrUrl: `/qr/${qrIdentity.qr_token}`,
                isPrivileged: true,
              }}
              label="Field Pass QR"
              variant="subtle"
              style={{ fontSize: "11px", padding: "5px 10px", minHeight: "30px" }}
            />
          )}

          <Link
            href="/judge"
            className="pegasus-button pegasus-button--subtle"
            style={{ fontSize: "11px", padding: "6px 12px", minHeight: "30px" }}
          >
            My Station
          </Link>
          <Link
            href="/"
            className="pegasus-button pegasus-button--subtle"
            style={{ fontSize: "11px", padding: "6px 12px", minHeight: "30px" }}
          >
            Public Site ↗
          </Link>

          {/* Logout Action */}
          <form action={logoutAction} style={{ margin: 0 }}>
            <button
              type="submit"
              className="pegasus-button pegasus-button--subtle"
              style={{
                fontSize: "11px",
                padding: "6px 10px",
                minHeight: "30px",
                color: "#f87171",
                borderColor: "rgba(248, 113, 113, 0.2)",
              }}
              title="Sign out of Referee Console"
            >
              Logout
            </button>
          </form>
        </div>
      </header>

      <div className="pegasus-judge-content">{children}</div>
    </div>
  );
}


