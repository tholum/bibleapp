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
import { ArrowLeft, Users } from "lucide-react";
import Link from "next/link";
import type { StudyGroup, StudyGroupInsert } from "@/types/database";

const createGroupSchema = z.object({
  name: z.string().min(3, "Group name must be at least 3 characters"),
  description: z.string().optional(),
});

type CreateGroupForm = z.infer<typeof createGroupSchema>;

export default function CreateGroupPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateGroupForm>({
    resolver: zodResolver(createGroupSchema),
  });

  const createGroupMutation = useMutation({
    mutationFn: async (data: CreateGroupForm): Promise<StudyGroup> => {
      if (!user?.id) throw new Error("Not authenticated");

      console.log("Creating group with user ID:", user.id);

      // Create the group (trigger auto-adds creator as owner)
      const newGroup: StudyGroupInsert = {
        name: data.name,
        description: data.description || null,
        created_by: user.id,
      };

      console.log("Insert payload:", newGroup);

      const { data: group, error: groupError } = await supabase
        .from("study_groups")
        .insert(newGroup as never)
        .select()
        .single();

      console.log("Insert result:", { group, groupError });

      if (groupError) throw groupError;

      return group as StudyGroup;
    },
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: ["user-groups"] });
      router.push(`/groups/${group.id}/`);
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const onSubmit = (data: CreateGroupForm) => {
    setError(null);
    createGroupMutation.mutate(data);
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
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>Create Study Group</CardTitle>
          </div>
          <CardDescription>
            Create a new group to study the Bible together with friends.
            You&apos;ll receive an invite code to share with others.
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
              label="Group Name"
              placeholder="e.g., Men's Bible Study"
              error={errors.name?.message}
              {...register("name")}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="What will this group study? Who should join?"
                {...register("description")}
              />
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                className="w-full"
                isLoading={createGroupMutation.isPending}
              >
                Create Group
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
