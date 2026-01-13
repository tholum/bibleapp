"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { ArrowLeft, BookOpen } from "lucide-react";
import Link from "next/link";
import type { BibleBook, Assignment, AssignmentInsert } from "@/types/database";

const createAssignmentSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  bookId: z.coerce.number().min(1, "Please select a book"),
  startChapter: z.coerce.number().min(1, "Chapter must be at least 1"),
  startVerse: z.coerce.number().min(1, "Verse must be at least 1"),
  endChapter: z.coerce.number().min(1, "Chapter must be at least 1"),
  endVerse: z.coerce.number().min(1, "Verse must be at least 1"),
  observationsPerVerse: z.coerce.number().min(1).max(20).default(7),
  dueDate: z.string().optional(),
});

type CreateAssignmentForm = {
  title: string;
  description?: string;
  bookId: number;
  startChapter: number;
  startVerse: number;
  endChapter: number;
  endVerse: number;
  observationsPerVerse: number;
  dueDate?: string;
};

export default function CreateAssignmentPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const groupId = params.groupId as string;
  const { user } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  // Fetch Bible books
  const { data: books } = useQuery({
    queryKey: ["bible-books"],
    queryFn: async (): Promise<BibleBook[]> => {
      const { data, error } = await supabase
        .from("bible_books")
        .select("*")
        .order("canonical_order");

      if (error) throw error;
      return (data as BibleBook[]) || [];
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<CreateAssignmentForm>({
    resolver: zodResolver(createAssignmentSchema) as any,
    defaultValues: {
      observationsPerVerse: 7,
    },
  });

  const selectedBookId = watch("bookId");
  const selectedBook = books?.find((b) => b.id === Number(selectedBookId));

  const createAssignmentMutation = useMutation({
    mutationFn: async (data: CreateAssignmentForm): Promise<Assignment> => {
      if (!user?.id) throw new Error("Not authenticated");

      const newAssignment: AssignmentInsert = {
        group_id: groupId,
        title: data.title,
        description: data.description || null,
        start_book_id: data.bookId,
        start_chapter: data.startChapter,
        start_verse: data.startVerse,
        end_book_id: data.bookId, // Same book for now
        end_chapter: data.endChapter,
        end_verse: data.endVerse,
        observations_per_verse: data.observationsPerVerse,
        due_date: data.dueDate || null,
        status: "active",
        created_by: user.id,
      };

      const { data: assignment, error } = await supabase
        .from("assignments")
        .insert(newAssignment as never)
        .select()
        .single();

      if (error) throw error;
      return assignment as Assignment;
    },
    onSuccess: (assignment) => {
      queryClient.invalidateQueries({ queryKey: ["group-assignments", groupId] });
      router.push(`/groups/${groupId}/assignments/${assignment.id}/`);
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const onSubmit = (data: CreateAssignmentForm) => {
    setError(null);
    createAssignmentMutation.mutate(data);
  };

  return (
    <div className="max-w-xl mx-auto">
      <Link
        href={`/groups/${groupId}/`}
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to group
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <BookOpen className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Create Assignment</CardTitle>
          </div>
          <CardDescription>
            Create a new assignment for your study group. Members will be able
            to add observations to the specified verses.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            <Input
              label="Assignment Title"
              placeholder="e.g., Week 1: Philippians 2:1-11"
              error={errors.title?.message}
              {...register("title")}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={2}
                placeholder="Any additional instructions or notes"
                {...register("description")}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Book
              </label>
              <select
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                {...register("bookId")}
              >
                <option value="">Select a book</option>
                <optgroup label="Old Testament">
                  {books
                    ?.filter((b) => b.testament === "OT")
                    .map((book) => (
                      <option key={book.id} value={book.id}>
                        {book.name}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="New Testament">
                  {books
                    ?.filter((b) => b.testament === "NT")
                    .map((book) => (
                      <option key={book.id} value={book.id}>
                        {book.name}
                      </option>
                    ))}
                </optgroup>
              </select>
              {errors.bookId && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.bookId.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start
                </label>
                <div className="flex space-x-2">
                  <Input
                    type="number"
                    placeholder="Ch"
                    min={1}
                    max={selectedBook?.chapter_count || 150}
                    error={errors.startChapter?.message}
                    {...register("startChapter")}
                  />
                  <Input
                    type="number"
                    placeholder="Vs"
                    min={1}
                    error={errors.startVerse?.message}
                    {...register("startVerse")}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End
                </label>
                <div className="flex space-x-2">
                  <Input
                    type="number"
                    placeholder="Ch"
                    min={1}
                    max={selectedBook?.chapter_count || 150}
                    error={errors.endChapter?.message}
                    {...register("endChapter")}
                  />
                  <Input
                    type="number"
                    placeholder="Vs"
                    min={1}
                    error={errors.endVerse?.message}
                    {...register("endVerse")}
                  />
                </div>
              </div>
            </div>

            <Input
              label="Observations per verse"
              type="number"
              min={1}
              max={20}
              helperText="How many observations should each member aim for per verse?"
              error={errors.observationsPerVerse?.message}
              {...register("observationsPerVerse")}
            />

            <Input
              label="Due Date (optional)"
              type="date"
              error={errors.dueDate?.message}
              {...register("dueDate")}
            />

            <div className="pt-4">
              <Button
                type="submit"
                className="w-full"
                isLoading={createAssignmentMutation.isPending}
              >
                Create Assignment
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
