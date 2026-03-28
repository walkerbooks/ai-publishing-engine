"use client";

import { useEffect } from "react";
import { getAccessToken } from "@/lib/auth/access-token";
import { useAuthStore } from "@/stores/auth-store";

/** Syncs Zustand auth state from localStorage on load (and other tabs via storage). */
export function AuthHydrate() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  useEffect(() => {
    hydrate();
    if (getAccessToken()) void refreshProfile();

    const onStorage = (e: StorageEvent) => {
      if (
        e.key === "ai_pub_access_token" ||
        e.key === "ai_pub_user_email" ||
        e.key === "ai_pub_user_first_name"
      ) {
        hydrate();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [hydrate, refreshProfile]);

  return null;
}
