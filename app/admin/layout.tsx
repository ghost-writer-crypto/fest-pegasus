import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/repositories";
import AdminShellClient from "@/components/admin/AdminShellClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pegasus Admin — Festival Control Center",
  description: "Operational Command Center for Pegasus Sports Festival",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Resolve server-side authenticated identity and verified profile
  const profile = await getAuthenticatedProfile();

  const isProduction = process.env.NODE_ENV === "production";
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );

  // 2. Strict server-side security authorization gate
  // In production or when Supabase is configured: fail closed unconditionally
  if (isProduction || hasSupabaseConfig) {
    if (!profile || profile.role !== "admin" || !profile.isActive) {
      redirect("/?error=unauthorized_admin");
    }
  }

  const adminUser = profile
    ? {
        userId: profile.userId,
        fullName: profile.fullName,
        role: profile.role,
        isActive: profile.isActive,
        email: profile.email ?? null,
      }
    : null;

  return <AdminShellClient user={adminUser}>{children}</AdminShellClient>;
}
