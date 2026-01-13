"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { ArrowLeft, UserPlus } from "lucide-react";
import Link from "next/link";
import type { GroupMembershipInsert } from "@/types/database";

type GroupBasic = { id: string; name: string };

const joinGroupSchema = z.object({
  inviteCode: z
    .string()
    .min(6, "Invite code must be at least 6 characters")
    .max(12, "Invite code must be at most 12 characters")
    .transform((val) => val.toUpperCase().replace(/\s/g, "")),
});

type JoinGroupForm = z.infer<typeof joinGroupSchema>;

export default function JoinGroupPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<JoinGroupForm>({
    resolver: zodResolver(joinGroupSchema),
  });

  const joinGroupMutation = useMutation({
    mutationFn: async (data: JoinGroupForm): Promise<GroupBasic> => {
      if (!user?.id) throw new Error("Not authenticated");

      // Find the group by invite code
      const { data: groupData, error: findError } = await supabase
        .from("study_groups")
        .select("id, name")
        .eq("invite_code", data.inviteCode)
        .single();

      if (findError || !groupData) {
        throw new Error("Invalid invite code. Please check and try again.");
      }

      const group = groupData as GroupBasic;

      // Check if already a member
      const { data: existingMembership } = await supabase
        .from("group_memberships")
        .select("id")
        .eq("group_id", group.id)
        .eq("user_id", user.id)
        .single();

      if (existingMembership) {
        throw new Error("You are already a member of this group.");
      }

      // Join the group
      const newMembership: GroupMembershipInsert = {
        group_id: group.id,
        user_id: user.id,
        role: "member",
      };

      const { error: joinError } = await supabase
        .from("group_memberships")
        .insert(newMembership as never);

      if (joinError) throw joinError;

      return group;
    },
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: ["user-groups"] });
      router.push(`/groups/${group.id}/`);
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const onSubmit = (data: JoinGroupForm) => {
    setError(null);
    joinGroupMutation.mutate(data);
  };

  return (
    <div className="max-w-xl mx-auto">
      <Link
        href="/groups/"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to groups
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserPlus className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Join a Study Group</CardTitle>
          </div>
          <CardDescription>
            Enter the invite code shared with you to join an existing study
            group.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            <Input
              label="Invite Code"
              placeholder="e.g., ABC123XY"
              error={errors.inviteCode?.message}
              className="uppercase tracking-widest text-center font-mono text-lg"
              maxLength={12}
              {...register("inviteCode")}
            />

            <p className="text-sm text-gray-500">
              Ask the group admin for the invite code. It&apos;s usually 8
              characters long.
            </p>

            <div className="pt-4">
              <Button
                type="submit"
                className="w-full"
                isLoading={joinGroupMutation.isPending}
              >
                Join Group
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
