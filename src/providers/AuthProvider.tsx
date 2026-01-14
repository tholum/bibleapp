"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase/client";

interface AuthProviderProps {
  children: ReactNode;
}

async function fetchOrCreateProfile(userId: string, userEmail: string | undefined, fullName: string | undefined) {
  // Try to fetch existing profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (!profileError) {
    return { profile, error: null };
  }

  // Profile doesn't exist - try to create it
  const displayName = fullName || userEmail?.split("@")[0] || "User";
  const { data: newProfile, error: createError } = await supabase
    .from("profiles")
    .upsert({
      id: userId,
      email: userEmail,
      display_name: displayName,
    } as never, { onConflict: "id" })
    .select()
    .single();

  if (createError) {
    console.error("Error creating profile:", createError.message || createError);
    return { profile: null, error: createError };
  }

  return { profile: newProfile, error: null };
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setUser, setSession, setProfile, setIsLoading } = useAuthStore();
  const initCompleted = useRef(false);

  useEffect(() => {
    let isMounted = true;

    // Safety timeout - if loading takes more than 10 seconds, force it to complete
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn("Auth initialization timed out, forcing load complete");
        setIsLoading(false);
      }
    }, 10000);

    // Get initial session
    const initAuth = async () => {
      if (initCompleted.current) return;
      initCompleted.current = true;

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (sessionError) {
          console.error("Error getting session:", sessionError);
          setUser(null);
          setSession(null);
          setProfile(null);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        // Fetch profile if user exists
        if (session?.user) {
          const { profile } = await fetchOrCreateProfile(
            session.user.id,
            session.user.email,
            session.user.user_metadata?.full_name
          );
          if (isMounted && profile) {
            setProfile(profile);
          }
        }
      } catch (error) {
        // Ignore AbortError from React Strict Mode
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        console.error("Error initializing auth:", error);
        if (isMounted) {
          setUser(null);
          setSession(null);
          setProfile(null);
        }
      } finally {
        if (isMounted) {
          clearTimeout(safetyTimeout);
          setIsLoading(false);
        }
      }
    };

    initAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      console.log("Auth state changed:", event);
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const { profile } = await fetchOrCreateProfile(
          session.user.id,
          session.user.email,
          session.user.user_metadata?.full_name
        );
        if (isMounted && profile) {
          setProfile(profile);
        }
      } else {
        setProfile(null);
      }

      if (isMounted) {
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [setUser, setSession, setProfile, setIsLoading]);

  return <>{children}</>;
}
