"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Users, Plus, ChevronRight, UserPlus } from "lucide-react";
import type { GroupRole } from "@/types/database";

type GroupMembershipWithGroup = {
  role: GroupRole;
  joined_at: string;
  study_groups: {
    id: string;
    name: string;
    description: string | null;
    invite_code: string | null;
    created_by: string;
  } | null;
};

export default function GroupsPage() {
  const { user } = useAuthStore();

  const { data: groups, isLoading } = useQuery({
    queryKey: ["user-groups", user?.id],
    queryFn: async (): Promise<GroupMembershipWithGroup[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("group_memberships")
        .select(
          `
          role,
          joined_at,
          study_groups (
            id,
            name,
            description,
            invite_code,
            created_by
          )
        `
        )
        .eq("user_id", user.id)
        .order("joined_at", { ascending: false });

      if (error) throw error;
      return (data as GroupMembershipWithGroup[]) || [];
    },
    enabled: !!user?.id,
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Study Groups</h1>
          <p className="text-gray-600 mt-1">
            Manage your study groups and assignments
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/groups/join/">
            <Button variant="outline">
              <UserPlus className="h-4 w-4 mr-2" />
              Join Group
            </Button>
          </Link>
          <Link href="/groups/create/">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : groups && groups.length > 0 ? (
        <div className="space-y-4">
          {groups.map((membership) => (
            <Link
              key={membership.study_groups?.id}
              href={`/groups/${membership.study_groups?.id}/`}
            >
              <Card className="hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Users className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {membership.study_groups?.name}
                        </h3>
                        {membership.study_groups?.description && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                            {membership.study_groups.description}
                          </p>
                        )}
                        <div className="flex items-center space-x-3 mt-2">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              membership.role === "owner"
                                ? "bg-purple-100 text-purple-700"
                                : membership.role === "admin"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {membership.role.charAt(0).toUpperCase() +
                              membership.role.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No study groups yet
            </h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              Create a new group to start studying with friends, or join an
              existing group with an invite code.
            </p>
            <div className="flex items-center justify-center space-x-3">
              <Link href="/groups/create/">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Group
                </Button>
              </Link>
              <Link href="/groups/join/">
                <Button variant="outline">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Join Group
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
