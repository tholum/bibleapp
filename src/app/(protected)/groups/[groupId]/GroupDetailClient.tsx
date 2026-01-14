"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Users,
  Settings,
  Plus,
  Copy,
  Check,
  Clock,
  BookOpen,
  ChevronRight,
  ArrowLeft,
  Play,
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import type { StudyGroup, GroupMembership, Assignment } from "@/types/database";

type MemberWithProfile = GroupMembership & {
  profiles: { display_name: string; avatar_url: string | null } | null;
};

type AssignmentWithBook = Assignment & {
  bible_books: { name: string; abbreviation: string } | null;
};

export default function GroupDetailPage() {
  const params = useParams();
  const groupId = params.groupId as string;
  const { user } = useAuthStore();
  const [copied, setCopied] = useState(false);

  // Fetch group details
  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ["group", groupId],
    queryFn: async (): Promise<StudyGroup | null> => {
      const { data, error } = await supabase
        .from("study_groups")
        .select("*")
        .eq("id", groupId)
        .single();

      if (error) throw error;
      return data as StudyGroup;
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

  // Fetch members
  const { data: members } = useQuery({
    queryKey: ["group-members", groupId],
    queryFn: async (): Promise<MemberWithProfile[]> => {
      const { data, error } = await supabase
        .from("group_memberships")
        .select(
          `
          *,
          profiles (
            display_name,
            avatar_url
          )
        `
        )
        .eq("group_id", groupId)
        .order("role", { ascending: true });

      if (error) throw error;
      return (data as MemberWithProfile[]) || [];
    },
  });

  // Fetch assignments
  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ["group-assignments", groupId],
    queryFn: async (): Promise<AssignmentWithBook[]> => {
      const { data, error } = await supabase
        .from("assignments")
        .select(
          `
          *,
          bible_books!assignments_start_book_id_fkey (
            name,
            abbreviation
          )
        `
        )
        .eq("group_id", groupId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as AssignmentWithBook[]) || [];
    },
  });

  const isAdmin = membership?.role === "owner" || membership?.role === "admin";

  const copyInviteCode = () => {
    if (group?.invite_code) {
      navigator.clipboard.writeText(group.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (groupLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Group not found</h2>
        <p className="text-gray-500 mt-2">
          This group may have been deleted or you don&apos;t have access.
        </p>
        <Link href="/groups/" className="mt-4 inline-block">
          <Button>Back to groups</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href="/groups/"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to groups
      </Link>

      {/* Group Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="p-4 bg-blue-100 rounded-xl">
            <Users className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
            {group.description && (
              <p className="text-gray-600 mt-1">{group.description}</p>
            )}
            <div className="flex items-center space-x-4 mt-2">
              <span className="text-sm text-gray-500">
                {members?.length || 0} members
              </span>
              {membership && (
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
              )}
            </div>
          </div>
        </div>
        {isAdmin && (
          <Link href={`/groups/${groupId}/settings/`}>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
        )}
      </div>

      {/* Invite Code Card */}
      {group.invite_code && (
        <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Invite Code</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Share this code with others to invite them to join
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <span className="font-mono text-2xl font-bold tracking-widest text-blue-600">
                  {group.invite_code}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyInviteCode}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Assignments */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center">
                <BookOpen className="h-5 w-5 mr-2 text-gray-500" />
                Assignments
              </CardTitle>
              {isAdmin && (
                <Link href={`/groups/${groupId}/assignments/create/`}>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    New
                  </Button>
                </Link>
              )}
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
                    <div
                      key={assignment.id}
                      className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <Link
                          href={`/groups/${groupId}/assignments/${assignment.id}/`}
                          className="flex-1 min-w-0"
                        >
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-900">
                              {assignment.title}
                            </h4>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                assignment.status === "active"
                                  ? "bg-green-100 text-green-700"
                                  : assignment.status === "completed"
                                    ? "bg-gray-100 text-gray-700"
                                    : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {assignment.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {assignment.bible_books?.name}{" "}
                            {assignment.start_chapter}:{assignment.start_verse}-
                            {assignment.end_chapter === assignment.start_chapter
                              ? ""
                              : `${assignment.end_chapter}:`}
                            {assignment.end_verse}
                          </p>
                          {assignment.due_date && (
                            <p className="text-xs text-gray-400 mt-1 flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              Due{" "}
                              {format(
                                new Date(assignment.due_date),
                                "MMM d, yyyy"
                              )}
                            </p>
                          )}
                        </Link>
                        <div className="flex items-center space-x-2 ml-4">
                          <Link href={`/study/${groupId}/${assignment.id}/`}>
                            <Button size="sm">
                              <Play className="h-4 w-4 mr-1" />
                              Study
                            </Button>
                          </Link>
                          <Link href={`/groups/${groupId}/assignments/${assignment.id}/`}>
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No assignments yet</p>
                  {isAdmin && (
                    <Link href={`/groups/${groupId}/assignments/create/`}>
                      <Button size="sm" className="mt-4">
                        Create First Assignment
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Members */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-gray-500" />
                Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              {members && members.length > 0 ? (
                <div className="space-y-3">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center space-x-3"
                    >
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                        {member.profiles?.display_name?.charAt(0).toUpperCase() ||
                          "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {member.profiles?.display_name || "Unknown"}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {member.role}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No members found</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
