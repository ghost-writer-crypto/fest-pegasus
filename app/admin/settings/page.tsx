import AdminModulePlaceholder from "@/components/admin/AdminModulePlaceholder";

export default function AdminSettingsPage() {
  return (
    <AdminModulePlaceholder
      title="Festival Configuration & Settings"
      category="System & Policy"
      description="Configure festival lifecycle phases, registration deadlines, scoring engine parameters, and role permissions."
      futureFeatures={[
        "Set festival timeline: Upcoming → Live → Completed",
        "Configure registration cutoff timestamps and call room rules",
        "Manage operator profiles, referee assignments, and RBAC permissions",
        "Database backup, audit export, and archive tools",
      ]}
    />
  );
}

