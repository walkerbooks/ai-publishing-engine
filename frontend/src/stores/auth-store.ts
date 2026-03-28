"use client";

import { create } from "zustand";
import { fetchAuthMe } from "@/lib/api/auth-client";
import { getLogger } from "@/lib/log";
import {
  clearAuthSession,
  getAccessToken,
  getUserEmail,
  getUserFirstName,
  setAuthSession,
} from "@/lib/auth/access-token";

type AuthState = {
  email: string | null;
  firstName: string | null;
  isAuthenticated: boolean;
  hydrate: () => void;
  setSession: (token: string, email: string, firstName?: string | null) => void;
  refreshProfile: () => Promise<void>;
  logout: () => void;
};

const log = getLogger("auth-store");

export const useAuthStore = create<AuthState>((set) => ({
  email: null,
  firstName: null,
  isAuthenticated: false,

  hydrate: () => {
    const token = getAccessToken();
    const email = getUserEmail();
    const firstName = getUserFirstName();
    set({
      isAuthenticated: Boolean(token),
      email: token ? email : null,
      firstName: token ? firstName : null,
    });
  },

  setSession: (token, email, firstName) => {
    setAuthSession(token, email, firstName ?? undefined);
    set({
      isAuthenticated: true,
      email,
      firstName: firstName && firstName.length > 0 ? firstName : null,
    });
  },

  refreshProfile: async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const { user } = await fetchAuthMe(token);
      setAuthSession(token, user.email, user.first_name);
      set({
        isAuthenticated: true,
        email: user.email,
        firstName: user.first_name?.trim() || null,
      });
    } catch (e) {
      log.warning("refreshProfile: auth/me failed; keeping cached session if any", e);
    }
  },

  logout: () => {
    log.debug("logout");
    clearAuthSession();
    set({ isAuthenticated: false, email: null, firstName: null });
  },
}));
