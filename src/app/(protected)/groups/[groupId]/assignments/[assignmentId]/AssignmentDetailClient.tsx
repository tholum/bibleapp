"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  BookOpen,
  Clock,
  Users,
  Eye,
  ArrowLeft,
  Play,
  CheckCircle,
} from "lucide-react";
import { format } from "date-fns";
import type { Assignment, Observation } from "@/types/database";

type AssignmentWithRelations = Assignment & {
  bible_books: { name: string; abbreviation: string } | null;
  study_groups: { name: string } | null;
};

type ObservationWithProfile = Observation & {
  profiles: { display_name: string } | null;
};

export default function AssignmentDetailPage() {
  const params = useParams();
  const groupId = params.groupId as string;
  const assignmentId = params.assignmentId as string;
  const { user } = useAuthStore();

  // Fetch assignment
  const { data: assignment, isLoading: assignmentLoading } = useQuery({
    queryKey: ["assignment", assignmentId],
    queryFn: async (): Promise<AssignmentWithRelations | null> => {
      const { data, error } = await supabase
        .from("assignments")
        .select(
          `
          *,
          bible_books!assignments_start_book_id_fkey (
            name,
            abbreviation
          ),
          study_groups (
            name
          )
        `
        )
        .eq("id", assignmentId)
        .single();

      if (error) throw error;
      return data as AssignmentWithRelations;
    },
  });

  // Fetch observations for this assignment
  const { data: observations } = useQuery({
    queryKey: ["assignment-observations", assignmentId],
    queryFn: async (): Promise<ObservationWithProfile[]> => {
      const { data, error } = await supabase
        .from("observations")
        .select(
          `
          *,
          profiles (
            display_name
          )
        `
        )
        .eq("assignment_id", assignmentId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as ObservationWithProfile[]) || [];
    },
  });

  // Count observations per user
  const userObservationCounts =
    observations?.reduce(
      (acc, obs) => {
        const userId = obs.user_id;
        acc[userId] = (acc[userId] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ) || {};

  // Get unique users
  const uniqueUsers = observations
    ? [...new Map(observations.map((o) => [o.user_id, o.profiles])).entries()]
    : [];

  // My observations count
  const myObservationsCount = observations?.filter(
    (o) => o.user_id === user?.id
  ).length;

  // Calculate verse count
  const verseCount =
    assignment && assignment.start_chapter === assignment.end_chapter
      ? assignment.end_verse - assignment.start_verse + 1
      : null; // Simplified - would need more logic for multi-chapter

  const targetObservations = verseCount
    ? verseCount * (assignment?.observations_per_verse || 7)
    : null;

  if (assignmentLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">
          Assignment not found
        </h2>
        <Link href={`/groups/${groupId}/`} className="mt-4 inline-block">
          <Button>Back to group</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href={`/groups/${groupId}/`}
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to {assignment.study_groups?.name}
      </Link>

      {/* Assignment Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  assignment.status === "active"
                    ? "bg-green-100 text-green-700"
                    : assignment.status === "completed"
                      ? "bg-gray-100 text-gray-700"
                      : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {assignment.status}
              </span>
              {assignment.due_date && (
                <span className="text-sm text-gray-500 flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  Due {format(new Date(assignment.due_date), "MMMM d, yyyy")}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {assignment.title}
            </h1>
            <p className="text-lg text-blue-600 mt-1">
              {assignment.bible_books?.name} {assignment.start_chapter}:
              {assignment.start_verse}
              {assignment.start_chapter !== assignment.end_chapter ||
              assignment.start_verse !== assignment.end_verse
                ? `-${assignment.end_chapter !== assignment.start_chapter ? `${assignment.end_chapter}:` : ""}${assignment.end_verse}`
                : ""}
            </p>
            {assignment.description && (
              <p className="text-gray-600 mt-2">{assignment.description}</p>
            )}
          </div>
          <Link
            href={`/groups/${groupId}/assignments/${assignmentId}/study/`}
          >
            <Button size="lg">
              <Play className="h-5 w-5 mr-2" />
              Start Studying
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Target Card */}
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-blue-600">
              {assignment.observations_per_verse}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Observations per verse
            </div>
          </CardContent>
        </Card>

        {/* My Progress Card */}
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-green-600">
              {myObservationsCount || 0}
              {targetObservations && (
                <span className="text-lg text-gray-400">
                  /{targetObservations}
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500 mt-1">My observations</div>
          </CardContent>
        </Card>

        {/* Group Progress Card */}
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-purple-600">
              {observations?.length || 0}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Total group observations
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Participants */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2 text-gray-500" />
            Participants ({uniqueUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {uniqueUsers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {uniqueUsers.map(([userId, profile]) => (
                <div
                  key={userId}
                  className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-600">
                    {profile?.display_name?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {profile?.display_name || "Unknown"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {userObservationCounts[userId]} observations
                    </p>
                  </div>
                  {userId === user?.id && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No one has started yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Be the first to add observations!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Observations Preview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <Eye className="h-5 w-5 mr-2 text-gray-500" />
            Recent Observations
          </CardTitle>
          <Link href={`/groups/${groupId}/assignments/${assignmentId}/study/`}>
            <Button variant="ghost" size="sm">
              View all
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {observations && observations.length > 0 ? (
            <div className="space-y-4">
              {observations.slice(0, 5).map((observation) => (
                <div
                  key={observation.id}
                  className="p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {observation.chapter}:{observation.start_verse}
                      </span>
                      <span className="text-xs text-gray-500 capitalize">
                        {observation.category.replace(/_/g, " ")}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {observation.profiles?.display_name}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {observation.content}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No observations yet</p>
              <Link
                href={`/groups/${groupId}/assignments/${assignmentId}/study/`}
              >
                <Button size="sm" className="mt-4">
                  Add First Observation
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
