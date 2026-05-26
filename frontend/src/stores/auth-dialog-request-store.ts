"use client";

import { create } from "zustand";

/**
 * Lets any screen (e.g. chat PayPal gate) open the same login/signup dialogs as the header.
 * AppHeader subscribes and bumps local Dialog state when request ids change.
 */
type State = {
  loginRequestId: number;
  signupRequestId: number;
  requestLogin: () => void;
  requestSignup: () => void;
};

export const useAuthDialogRequestStore = create<State>((set, get) => ({
  loginRequestId: 0,
  signupRequestId: 0,
  requestLogin: () => set({ loginRequestId: get().loginRequestId + 1 }),
  requestSignup: () => set({ signupRequestId: get().signupRequestId + 1 }),
}));
