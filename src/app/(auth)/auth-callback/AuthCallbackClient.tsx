"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getPendingInvite, clearPendingInvite } from "@/lib/pending-invite";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { BookOpen } from "lucide-react";

export default function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Signing you in...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const type = searchParams.get("type");

        // Handle password recovery
        if (type === "recovery") {
          router.push("/reset-password/");
          return;
        }

        // Handle OAuth and magic link callbacks
        // Supabase automatically handles the token exchange via detectSessionInUrl
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          setError(error.message);
          return;
        }

        if (session) {
          // Check for pending invite
          const pendingInvite = getPendingInvite();

          if (pendingInvite) {
            setStatus("Joining group...");

            try {
              // Find the group by invite code
              const { data: groupData, error: findError } = await supabase
                .from("study_groups")
                .select("id, name")
                .eq("invite_code", pendingInvite.inviteCode)
                .single();

              if (findError || !groupData) {
                console.error("Could not find group:", findError);
                clearPendingInvite();
                router.push("/dashboard/");
                return;
              }

              const group = groupData as { id: string; name: string };

              // Check if already a member
              const { data: existingMembership } = await supabase
                .from("group_memberships")
                .select("id")
                .eq("group_id", group.id)
                .eq("user_id", session.user.id)
                .single();

              if (existingMembership) {
                // Already a member, just redirect to group
                clearPendingInvite();
                router.push(`/groups/${group.id}/`);
                return;
              }

              // Join the group
              const { error: joinError } = await supabase
                .from("group_memberships")
                .insert({
                  group_id: group.id,
                  user_id: session.user.id,
                  role: "member",
                } as never);

              if (joinError) {
                console.error("Failed to join group:", joinError);
                clearPendingInvite();
                router.push("/dashboard/");
                return;
              }

              // Successfully joined - redirect to group
              clearPendingInvite();
              router.push(`/groups/${group.id}/`);
            } catch (err) {
              console.error("Error processing pending invite:", err);
              clearPendingInvite();
              router.push("/dashboard/");
            }
          } else {
            // No pending invite, go to dashboard
            router.push("/dashboard/");
          }
        } else {
          // If no session, redirect to login
          router.push("/login/");
        }
      } catch (err) {
        setError("An unexpected error occurred");
        console.error("Auth callback error:", err);
      }
    };

    handleCallback();
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Authentication Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600">{error}</p>
            <p className="text-center mt-4">
              <a href="/login/" className="text-blue-600 hover:text-blue-700">
                Return to login
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-full animate-pulse">
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <CardTitle>{status}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
