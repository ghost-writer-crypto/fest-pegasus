import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthenticatedProfile, getOrCreateQrIdentity } from "@/lib/repositories";
import AdminShellClient from "@/components/admin/AdminShellClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ZENITHROW Admin — Festival Control Center",
  description: "Operational Command Center for ZENITHROW 2026 Sports Festival",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Resolve server-side authenticated identity and verified profile
  const profile = await getAuthenticatedProfile();

  // 2. Strict server-side security authorization gate
  if (!profile || profile.role !== "admin" || !profile.isActive) {
    redirect("/login?redirect=/admin&error=unauthorized_admin");
  }

  const effectiveAdminId = profile.userId;
  const qrIdentity = await getOrCreateQrIdentity("profile", effectiveAdminId);


  const adminUser = {
    userId: profile.userId,
    fullName: profile.fullName,
    role: profile.role,
    isActive: profile.isActive,
    email: profile.email ?? null,
    qrToken: qrIdentity.qr_token,
  };

  return <AdminShellClient user={adminUser}>{children}</AdminShellClient>;
}
