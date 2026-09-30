import { getActiveFestival } from "@/lib/repositories";
import AdminImportClient from "@/components/admin/AdminImportClient";

export const metadata = {
  title: "Festival Data Import | Pegasus Admin",
  description: "Bulk data ingestion engine for students, events, and registrations",
};

export default async function AdminImportPage() {
  const activeFestival = await getActiveFestival();
  const festivalId = activeFestival?.id || "fest-2026";

  return <AdminImportClient festivalId={festivalId} />;
}
