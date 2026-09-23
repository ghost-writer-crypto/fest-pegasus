import AdminModulePlaceholder from "@/components/admin/AdminModulePlaceholder";

export default function AdminEventsPage() {
  return (
    <AdminModulePlaceholder
      title="Event Configuration"
      category="Competition Events"
      description="Define festival competition events, map Codex rules, assign point classifications, and set division quotas."
      futureFeatures={[
        "Instantiate festival events from the authoritative Codex catalog (59 events)",
        "Configure event point classes (W, X, Y, Z) and scoring engines",
        "Set division quota limits (minimum athletes, maximum athletes, substitutes)",
        "Audit event registration status and competitor caps",
      ]}
    />
  );
}

