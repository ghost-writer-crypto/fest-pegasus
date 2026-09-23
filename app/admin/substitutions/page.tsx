import {
  getActiveFestival,
  getSubstitutionsByFestival,
} from "@/lib/repositories";
import AdminSubstitutionsClient from "@/components/admin/AdminSubstitutionsClient";

export const dynamic = "force-dynamic";

export default async function AdminSubstitutionsPage() {
  const festival = await getActiveFestival();
  const festivalId = festival?.id || "pegasus-2026";

  const substitutions = await getSubstitutionsByFestival(festivalId);

  return (
    <div className="pegasus-admin-content">
      <header style={{ marginBottom: "28px" }}>
        <p className="pegasus-eyebrow">OPERATIONS • CALL ROOM & SCRATCHES</p>
        <h1 className="pegasus-page-title">Athlete Substitutions Desk</h1>
        <p className="pegasus-page__description">
          Review, approve, and track athlete substitutions across all participating houses.
          Enforces standard (₹20) and emergency (₹50) fee tiers with full audit history.
        </p>
      </header>

      <AdminSubstitutionsClient
        festivalId={festivalId}
        initialSubstitutions={substitutions}
      />
    </div>
  );
}

