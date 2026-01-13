"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase/client";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setUser, setSession, setProfile, setIsLoading } = useAuthStore();
  const initCompleted = useRef(false);

  useEffect(() => {
    // Safety timeout - if loading takes more than 10 seconds, force it to complete
    const safetyTimeout = setTimeout(() => {
      console.warn("Auth initialization timed out, forcing load complete");
      setIsLoading(false);
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
          try {
            const { data: profile, error: profileError } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", session.user.id)
              .single();

            if (profileError) {
              // Profile might not exist - try to create it
              console.warn("Profile not found, creating one...");
              const displayName =
                session.user.user_metadata?.full_name ||
                session.user.email?.split("@")[0] ||
                "User";
              const { data: newProfile, error: createError } = await supabase
                .from("profiles")
                .insert({
                  id: session.user.id,
                  email: session.user.email,
                  display_name: displayName,
                } as never)
                .select()
                .single();

              if (createError) {
                console.error("Error creating profile:", createError);
              } else {
                setProfile(newProfile);
              }
            } else {
              setProfile(profile);
            }
          } catch (profileErr) {
            console.error("Exception fetching profile:", profileErr);
          }
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        setUser(null);
        setSession(null);
        setProfile(null);
      } finally {
        clearTimeout(safetyTimeout);
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event);
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        try {
          // Fetch profile on auth change
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();

          if (profileError) {
            // Profile might not exist - try to create it
            console.warn("Profile not found on auth change, creating one...");
            const displayName =
              session.user.user_metadata?.full_name ||
              session.user.email?.split("@")[0] ||
              "User";
            const { data: newProfile, error: createError } = await supabase
              .from("profiles")
              .insert({
                id: session.user.id,
                email: session.user.email,
                display_name: displayName,
              } as never)
              .select()
              .single();

            if (createError) {
              console.error("Error creating profile on auth change:", createError);
            } else {
              setProfile(newProfile);
            }
          } else {
            setProfile(profile);
          }
        } catch (err) {
          console.error("Exception fetching profile on auth change:", err);
        }
      } else {
        setProfile(null);
      }

      setIsLoading(false);
    });

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [setUser, setSession, setProfile, setIsLoading]);

  return <>{children}</>;
}
