"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Users, BookOpen, Plus, Clock, ChevronRight } from "lucide-react";
import { format } from "date-fns";

type GroupMembershipWithGroup = {
  role: string;
  study_groups: {
    id: string;
    name: string;
    description: string | null;
  } | null;
};

type AssignmentWithRelations = {
  id: string;
  group_id: string;
  title: string;
  start_chapter: number;
  start_verse: number;
  end_chapter: number;
  end_verse: number;
  due_date: string | null;
  study_groups: {
    name: string;
  } | null;
  bible_books: {
    name: string;
    abbreviation: string;
  } | null;
};

export default function DashboardPage() {
  const { user, profile } = useAuthStore();

  // Fetch user's groups
  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ["user-groups", user?.id],
    queryFn: async (): Promise<GroupMembershipWithGroup[] | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("group_memberships")
        .select(
          `
          role,
          study_groups (
            id,
            name,
            description
          )
        `
        )
        .eq("user_id", user.id);

      if (error) throw error;
      return data as GroupMembershipWithGroup[];
    },
    enabled: !!user?.id,
  });

  // Fetch recent assignments from user's groups
  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ["recent-assignments", groups],
    queryFn: async (): Promise<AssignmentWithRelations[] | null> => {
      if (!groups || groups.length === 0) return null;

      const groupIds = groups
        .map((g) => g.study_groups?.id)
        .filter((id): id is string => typeof id === "string");

      if (groupIds.length === 0) return null;

      const { data, error } = await supabase
        .from("assignments")
        .select(
          `
          id,
          group_id,
          title,
          start_chapter,
          start_verse,
          end_chapter,
          end_verse,
          due_date,
          study_groups (
            name
          ),
          bible_books!assignments_start_book_id_fkey (
            name,
            abbreviation
          )
        `
        )
        .in("group_id", groupIds)
        .eq("status", "active")
        .order("due_date", { ascending: true })
        .limit(5);

      if (error) throw error;
      return data as AssignmentWithRelations[];
    },
    enabled: !!groups && groups.length > 0,
  });

  return (
    <div className="max-w-6xl mx-auto">
      {/* Welcome section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {profile?.display_name || "Student"}!
        </h1>
        <p className="text-gray-600 mt-1">
          Continue your Bible study journey today.
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Link href="/groups/create/">
          <Card className="hover:border-blue-300 hover:shadow-md transition-all cursor-pointer h-full">
            <CardContent className="p-6 flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Plus className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Create Study Group
                </h3>
                <p className="text-sm text-gray-500">
                  Start a new group with friends
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/groups/join/">
          <Card className="hover:border-blue-300 hover:shadow-md transition-all cursor-pointer h-full">
            <CardContent className="p-6 flex items-center space-x-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Join a Group</h3>
                <p className="text-sm text-gray-500">Enter an invite code</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dictionary/">
          <Card className="hover:border-blue-300 hover:shadow-md transition-all cursor-pointer h-full">
            <CardContent className="p-6 flex items-center space-x-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <BookOpen className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Word Study</h3>
                <p className="text-sm text-gray-500">
                  Search Strong&apos;s Concordance
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* My Groups */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2 text-gray-500" />
              My Study Groups
            </CardTitle>
            <Link href="/groups/">
              <Button variant="ghost" size="sm">
                View all
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {groupsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 bg-gray-100 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : groups && groups.length > 0 ? (
              <div className="space-y-3">
                {groups.slice(0, 5).map((membership) => (
                  <Link
                    key={membership.study_groups?.id}
                    href={`/groups/${membership.study_groups?.id}/`}
                    className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {membership.study_groups?.name}
                        </h4>
                        <p className="text-sm text-gray-500 capitalize">
                          {membership.role}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  You haven&apos;t joined any groups yet
                </p>
                <div className="mt-4 space-x-2">
                  <Link href="/groups/create/">
                    <Button size="sm">Create a group</Button>
                  </Link>
                  <Link href="/groups/join/">
                    <Button variant="outline" size="sm">
                      Join a group
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Assignments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-gray-500" />
              Upcoming Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assignmentsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-20 bg-gray-100 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : assignments && assignments.length > 0 ? (
              <div className="space-y-3">
                {assignments.map((assignment) => (
                  <Link
                    key={assignment.id}
                    href={`/groups/${assignment.group_id}/assignments/${assignment.id}/`}
                    className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {assignment.title}
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">
                          {assignment.bible_books?.name}{" "}
                          {assignment.start_chapter}:{assignment.start_verse}-
                          {assignment.end_verse}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {assignment.study_groups?.name}
                        </p>
                      </div>
                      {assignment.due_date && (
                        <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                          Due{" "}
                          {format(new Date(assignment.due_date), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No upcoming assignments</p>
                <p className="text-sm text-gray-400 mt-1">
                  Join a group to see assignments
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
