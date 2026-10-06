"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  setSessionCookie,
  clearSessionCookie,
  PRESET_OPERATORS,
  getSafeRedirectDestination,
} from "@/lib/auth/session";

export type LoginActionResult = {
  success: boolean;
  error?: string;
};

function getDashboardForRole(role: string): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "judge":
      return "/judge";
    case "team_manager":
      return "/team-manager";
    case "desk_operator":
      return "/admin/verification";
    default:
      return "/";
  }
}

/**
 * Server action for direct demonstration login as a preset festival operator.
 * STRICTLY DISABLED in production environments.
 */
export async function loginAsDemoRoleAction(
  presetKey: string,
  redirectTo?: string,
): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    redirect("/login?error=demo_disabled_in_production");
  }

  const operator = PRESET_OPERATORS[presetKey];
  if (!operator) {
    redirect(`/login?error=invalid_preset`);
  }

  await setSessionCookie(operator);

  const destination = getSafeRedirectDestination(
    redirectTo,
    getDashboardForRole(operator.role),
  );
  redirect(destination);
}

/**
 * Server action to log in via individual credentials (Email + Password).
 * In production: strictly enforces Supabase Auth individual credentials without fallback bypass.
 */
export async function loginWithCredentialsAction(
  prevState: LoginActionResult | null,
  formData: FormData,
): Promise<LoginActionResult> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const redirectTo = (formData.get("redirectTo") as string) || "";

  if (!email || !password) {
    return { success: false, error: "Both email and password are required." };
  }

  const isProduction = process.env.NODE_ENV === "production";

  // 1. Supabase Auth Individual Account Authentication
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  ) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data.user) {
        // Resolve profile role from database
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, is_active")
          .eq("id", data.user.id)
          .maybeSingle();

        if (!profile || !profile.is_active) {
          await supabase.auth.signOut();
          return { success: false, error: "Your account is inactive or lacks operational role clearance." };
        }

        const destination = getSafeRedirectDestination(
          redirectTo,
          getDashboardForRole(profile.role),
        );
        redirect(destination);
      } else if (isProduction) { console.error("[LOGIN] Supabase signIn failed:", { message: error?.message, code: error?.code, status: error?.status });
        return {
          success: false,
          error: "Invalid email or password. Please check your credentials.",
        };
      }
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "digest" in err &&
        typeof (err as { digest: string }).digest === "string" &&
        (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
      ) {
        throw err;
      }
      console.error("[loginWithCredentialsAction] Supabase Auth Error:", err);
      if (isProduction) {
        return {
          success: false,
          error: "Authentication service error. Please try again later.",
        };
      }
    }
  } else if (isProduction) {
    return {
      success: false,
      error: "Authentication service unavailable in production.",
    };
  }

  // 2. Development-Only Offline Mock Authentication
  if (!isProduction) {
    const matchedPreset = Object.values(PRESET_OPERATORS).find(
      (op) => op.email?.toLowerCase() === email || email.startsWith(op.role),
    );

    if (matchedPreset) {
      await setSessionCookie(matchedPreset);
      const destination = getSafeRedirectDestination(
        redirectTo,
        getDashboardForRole(matchedPreset.role),
      );
      redirect(destination);
    }
  }

  return {
    success: false,
    error: "Invalid operator credentials.",
  };
}


/**
 * Universal logout server action.
 */
export async function logoutAction(): Promise<void> {
  // Clear Supabase session if present
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  ) {
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
  }

  // Clear cookie session
  await clearSessionCookie();

  redirect("/login?logged_out=1");
}

