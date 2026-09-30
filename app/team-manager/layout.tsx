import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedProfile, getOrCreateQrIdentity } from "@/lib/repositories";
import { logoutAction } from "@/app/login/actions";
import ShowQrButton from "@/components/qr/ShowQrButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pegasus Team Manager — House Operations Portal",
  description: "Official portal for house captains and team managers",
};

export default async function TeamManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getAuthenticatedProfile();

  if (!profile || (profile.role !== "team_manager" && profile.role !== "admin") || !profile.isActive) {
    redirect("/login?redirect=/team-manager&error=unauthorized_tm");
  }

  const qrIdentity = await getOrCreateQrIdentity("profile", profile.userId);
  const teamLabel = profile.teamId ? profile.teamId.toUpperCase() : "HOUSE-OPS";

  return (
    <div className="pegasus-tm-shell">
      <header className="pegasus-tm-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
          <Link href="/team-manager" className="pegasus-brand">
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
              HOUSE OPERATIONS
            </span>
            <span style={{ fontSize: "13px", fontWeight: 750, color: "var(--foreground)" }}>
              Team Manager Portal
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* Captain Identity Badge */}
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
                background: "rgba(242, 184, 75, 0.15)",
                color: "#F2B84B",
                padding: "2px 6px",
                borderRadius: "2px",
              }}
            >
              {teamLabel}
            </span>
          </div>

          {/* Show Captain QR Button */}
          {qrIdentity && (
            <ShowQrButton
              data={{
                name: profile.fullName,
                role: "team_manager",
                roleLabel: `House Captain (${teamLabel})`,
                identifier: `CAPTAIN ID: TM-${profile.userId.slice(0, 6).toUpperCase()}`,
                qrUrl: `/qr/${qrIdentity.qr_token}`,
                isPrivileged: true,
              }}
              label="Manager Pass QR"
              variant="subtle"
              style={{ fontSize: "11px", padding: "5px 10px", minHeight: "30px" }}
            />
          )}

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
              title="Sign out of Team Manager Portal"
            >
              Logout
            </button>
          </form>
        </div>
      </header>

      <div className="pegasus-tm-content">{children}</div>
    </div>
  );
}


