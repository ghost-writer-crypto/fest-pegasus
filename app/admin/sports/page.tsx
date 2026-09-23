import AdminModulePlaceholder from "@/components/admin/AdminModulePlaceholder";

export default function AdminSportsPage() {
  return (
    <AdminModulePlaceholder
      title="Sport Disciplines"
      category="Sports Catalog"
      description="Administrative control of official sports, competition disciplines, and categories."
      futureFeatures={[
        "Configure festival sport disciplines and category hierarchies",
        "Manage sport rules, scoring engine assignments, and equipment specifications",
        "Assign discipline chief referees and technical delegates",
      ]}
    />
  );
}

