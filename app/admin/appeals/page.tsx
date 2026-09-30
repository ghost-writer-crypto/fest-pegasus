import {
  getActiveFestival,
  getAppealsByFestival,
} from "@/lib/repositories";
import AdminAppealsClient from "@/components/admin/AdminAppealsClient";

export const dynamic = "force-dynamic";

export default async function AdminAppealsPage() {
  const festival = await getActiveFestival();
  const festivalId = festival?.id || "pegasus-2026";

  const appeals = await getAppealsByFestival(festivalId);

  return (
    <div className="pegasus-admin-content">
      <header style={{ marginBottom: "28px" }}>
        <p className="pegasus-eyebrow">JURY OF APPEAL • DISPUTE ADJUDICATION</p>
        <h1 className="pegasus-page-title">Appeals & Protests Desk</h1>
        <p className="pegasus-page__description">
          Review, investigate, and adjudicate official protests lodged by house captains in accordance
          with Pegasus Codex 2026 rules (Fee: ₹70). Accepted decisions update the authoritative result
          and recalculate championship leaderboards dynamically.
        </p>
      </header>

      <AdminAppealsClient
        festivalId={festivalId}
        initialAppeals={appeals}
      />
    </div>
  );
}
