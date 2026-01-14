"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { storePendingInvite, clearPendingInvite } from "@/lib/pending-invite";
import Link from "next/link";
import { Users, BookOpen, ArrowRight, Check, Loader2 } from "lucide-react";
import type { GroupMembershipInsert } from "@/types/database";

type GroupInfo = {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
};

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const inviteCode = params.inviteCode as string;
  const { user, isLoading: authLoading, hasHydrated } = useAuthStore();
  const [joinError, setJoinError] = useState<string | null>(null);

  // Fetch group info by invite code (public query - no auth required)
  const { data: group, isLoading: groupLoading, error: groupError } = useQuery({
    queryKey: ["invite-group", inviteCode],
    queryFn: async (): Promise<GroupInfo | null> => {
      // First, find the group by invite code
      const { data: groupData, error: findError } = await supabase
        .from("study_groups")
        .select("id, name, description")
        .eq("invite_code", inviteCode.toUpperCase())
        .single();

      if (findError || !groupData) {
        throw new Error("Invalid invite code");
      }

      const fetchedGroup = groupData as { id: string; name: string; description: string | null };

      // Get member count
      const { count } = await supabase
        .from("group_memberships")
        .select("*", { count: "exact", head: true })
        .eq("group_id", fetchedGroup.id);

      return {
        id: fetchedGroup.id,
        name: fetchedGroup.name,
        description: fetchedGroup.description,
        member_count: count || 0,
      };
    },
    retry: false,
  });

  // Check if user is already a member
  const { data: existingMembership, isLoading: membershipLoading } = useQuery({
    queryKey: ["membership-check", group?.id, user?.id],
    queryFn: async () => {
      if (!group?.id || !user?.id) return null;

      const { data } = await supabase
        .from("group_memberships")
        .select("id")
        .eq("group_id", group.id)
        .eq("user_id", user.id)
        .single();

      return data;
    },
    enabled: !!group?.id && !!user?.id,
  });

  // Join group mutation
  const joinMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !group?.id) {
        throw new Error("Not authenticated");
      }

      const newMembership: GroupMembershipInsert = {
        group_id: group.id,
        user_id: user.id,
        role: "member",
      };

      const { error } = await supabase
        .from("group_memberships")
        .insert(newMembership as never);

      if (error) throw error;
    },
    onSuccess: () => {
      clearPendingInvite();
      router.push(`/groups/${group?.id}/`);
    },
    onError: (error) => {
      setJoinError(error.message);
    },
  });

  // Handle authenticated user - either join or redirect if already member
  useEffect(() => {
    if (!hasHydrated || authLoading || groupLoading || membershipLoading) return;
    if (!user || !group) return;

    if (existingMembership) {
      // Already a member, redirect to group
      clearPendingInvite();
      router.push(`/groups/${group.id}/`);
    }
  }, [hasHydrated, authLoading, groupLoading, membershipLoading, user, group, existingMembership, router]);

  // Store pending invite before redirecting to auth
  const handleAuthRedirect = (path: string) => {
    if (group) {
      storePendingInvite({
        inviteCode: inviteCode.toUpperCase(),
        groupId: group.id,
        groupName: group.name,
      });
    }
    router.push(path);
  };

  // Handle join for authenticated users
  const handleJoin = () => {
    if (!user) {
      handleAuthRedirect("/login/");
      return;
    }
    joinMutation.mutate();
  };

  // Loading state
  if (!hasHydrated || authLoading || groupLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading invite...</p>
        </div>
      </div>
    );
  }

  // Invalid invite code
  if (groupError || !group) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invite Link</h1>
            <p className="text-gray-600 mb-6">
              This invite link is invalid or has expired. Please ask for a new invite link.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Already a member - show redirect message
  if (user && existingMembership) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Redirecting to group...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2">
            <div className="p-2 bg-blue-600 rounded-xl">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">Bible Study</span>
          </div>
        </div>

        {/* Invite Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8 text-center text-white">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-2">You&apos;re Invited!</h1>
            <p className="text-blue-100">Join this Bible study group</p>
          </div>

          {/* Group Info */}
          <div className="p-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">{group.name}</h2>
              {group.description && (
                <p className="text-gray-600 text-sm">{group.description}</p>
              )}
              <p className="text-sm text-gray-500 mt-2">
                {group.member_count} {group.member_count === 1 ? "member" : "members"}
              </p>
            </div>

            {/* Error Message */}
            {joinError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{joinError}</p>
              </div>
            )}

            {/* Actions */}
            {user ? (
              // Logged in - show join button
              <button
                onClick={handleJoin}
                disabled={joinMutation.isPending}
                className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
              >
                {joinMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5 mr-2" />
                    Join Group
                  </>
                )}
              </button>
            ) : (
              // Not logged in - show auth options
              <div className="space-y-3">
                <button
                  onClick={() => handleAuthRedirect("/signup/")}
                  className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Create Account to Join
                  <ArrowRight className="h-5 w-5 ml-2" />
                </button>
                <button
                  onClick={() => handleAuthRedirect("/login/")}
                  className="w-full flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Sign In to Join
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          By joining, you&apos;ll be able to study Scripture together with this group.
        </p>
      </div>
    </div>
  );
}
