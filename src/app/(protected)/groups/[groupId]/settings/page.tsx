"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import {
  ArrowLeft,
  Settings,
  Key,
  Share2,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import type { StudyGroup, GroupMembership } from "@/types/database";

type GroupWithSharer = StudyGroup & {
  sharer_profile?: { display_name: string } | null;
};

export default function GroupSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const { user, profile } = useAuthStore();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch group details with sharer profile
  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ["group", groupId],
    queryFn: async (): Promise<GroupWithSharer | null> => {
      const { data, error } = await supabase
        .from("study_groups")
        .select("*")
        .eq("id", groupId)
        .single();

      if (error) throw error;

      // Fetch sharer profile if there's a shared key
      if (data?.shared_api_bible_key_by) {
        const { data: sharerProfile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", data.shared_api_bible_key_by)
          .single();

        return { ...data, sharer_profile: sharerProfile } as GroupWithSharer;
      }

      return data as GroupWithSharer;
    },
  });

  // Fetch user's membership
  const { data: membership } = useQuery({
    queryKey: ["group-membership", groupId, user?.id],
    queryFn: async (): Promise<GroupMembership | null> => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("group_memberships")
        .select("*")
        .eq("group_id", groupId)
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      return data as GroupMembership;
    },
    enabled: !!user?.id,
  });

  const isAdmin = membership?.role === "owner" || membership?.role === "admin";
  const hasApiKey = !!profile?.api_bible_key;
  const isCurrentSharer = group?.shared_api_bible_key_by === user?.id;

  // Share API key mutation
  const shareApiKeyMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !profile?.api_bible_key) {
        throw new Error("You need to configure your API key in Settings first");
      }

      const { error } = await supabase
        .from("study_groups")
        .update({
          shared_api_bible_key: profile.api_bible_key,
          shared_api_bible_key_by: user.id,
        })
        .eq("id", groupId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      setSuccess("Your API key is now shared with this group");
      setError(null);
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
      setSuccess(null);
    },
  });

  // Stop sharing API key mutation
  const stopSharingMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("study_groups")
        .update({
          shared_api_bible_key: null,
          shared_api_bible_key_by: null,
        })
        .eq("id", groupId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      setSuccess("API key sharing has been stopped");
      setError(null);
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
      setSuccess(null);
    },
  });

  if (groupLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Group not found</h2>
        <Link href="/groups/" className="mt-4 inline-block">
          <Button>Back to groups</Button>
        </Link>
      </div>
    );
  }

  if (!isAdmin) {
    router.push(`/groups/${groupId}/`);
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href={`/groups/${groupId}/`}
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to {group.name}
      </Link>

      <div className="flex items-center space-x-3 mb-8">
        <div className="p-2 bg-gray-100 rounded-lg">
          <Settings className="h-6 w-6 text-gray-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Group Settings</h1>
          <p className="text-gray-600">{group.name}</p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Share API Key */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Key className="h-5 w-5 mr-2 text-gray-500" />
            Share Bible API Key
          </CardTitle>
          <CardDescription>
            Share your API.Bible key with group members so they can view Scripture without their own key
          </CardDescription>
        </CardHeader>
        <CardContent>
          {group.shared_api_bible_key ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Share2 className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">API Key is being shared</span>
                </div>
                <p className="text-sm text-green-700">
                  {isCurrentSharer ? (
                    "You are sharing your API key with this group"
                  ) : (
                    <>Shared by {group.sharer_profile?.display_name || "a group member"}</>
                  )}
                </p>
              </div>

              {isCurrentSharer && (
                <Button
                  variant="outline"
                  onClick={() => stopSharingMutation.mutate()}
                  isLoading={stopSharingMutation.isPending}
                  className="w-full"
                >
                  <X className="h-4 w-4 mr-2" />
                  Stop Sharing My API Key
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600">
                  No API key is currently shared with this group. Members need their own key to view Scripture.
                </p>
              </div>

              {hasApiKey ? (
                <Button
                  onClick={() => shareApiKeyMutation.mutate()}
                  isLoading={shareApiKeyMutation.isPending}
                  className="w-full"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share My API Key with Group
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-amber-600 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    You need to configure your API key first
                  </p>
                  <Link href="/settings/">
                    <Button variant="outline" className="w-full">
                      <Key className="h-4 w-4 mr-2" />
                      Configure API Key in Settings
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
