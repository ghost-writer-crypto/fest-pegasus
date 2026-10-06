import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/repositories";

export type AppRole = "admin" | "judge" | "team_manager" | "desk_operator" | "guest";

export async function requireRole(allowed: AppRole[], returnTo: string) {
  const profile = await getAuthenticatedProfile().catch(() => null);
  if (!profile || !profile.isActive) {
    redirect(`/login?redirect=${encodeURIComponent(returnTo)}&error=unauthorized`);
  }
  if (!allowed.includes(profile.role as AppRole)) {
    redirect(`/login?redirect=${encodeURIComponent(returnTo)}&error=forbidden`);
  }
  return profile;
}