import AdminModulePlaceholder from "@/components/admin/AdminModulePlaceholder";

export default function AdminLivePage() {
  return (
    <AdminModulePlaceholder
      title="Live Operations Room"
      category="Live Field Operations"
      description="Real-time monitor for ongoing heats, live matches, call rooms, and active field stations."
      futureFeatures={[
        "Real-time scoreboard sync across all simultaneous competition venues",
        "Call room marshalling and athlete check-in status",
        "Active heat progress, false start resets, and live lap tracking",
        "Direct intercom and broadcast alerts to referee field terminals",
      ]}
    />
  );
}

