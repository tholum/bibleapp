import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Session } from "@supabase/supabase-js";
import type { Profile } from "@/types/database";

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  hasHydrated: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  signOut: () => void;
  clearStore: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      profile: null,
      isLoading: true,
      hasHydrated: false,
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setProfile: (profile) => set({ profile }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      signOut: () => set({ user: null, session: null, profile: null }),
      clearStore: () => {
        // Clear localStorage and reset state
        if (typeof window !== "undefined") {
          localStorage.removeItem("auth-storage");
        }
        set({ user: null, session: null, profile: null, isLoading: false });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        // Only persist these fields - NOT user to avoid stale data issues
        profile: state.profile,
      }),
      onRehydrateStorage: () => (state) => {
        // Called when hydration is complete
        state?.setHasHydrated(true);
      },
    }
  )
);
