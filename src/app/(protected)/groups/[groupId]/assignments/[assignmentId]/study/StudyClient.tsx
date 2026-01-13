"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  ArrowLeft,
  Plus,
  User,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  X,
  BookOpen,
  Search,
  Check,
} from "lucide-react";
import { getPassage, getBibles, buildPassageId, DEFAULT_BIBLE_ID } from "@/lib/api-bible/client";
import type { ObservationCategory, Assignment, Observation, ObservationInsert } from "@/types/database";
import { Settings } from "lucide-react";

type AssignmentWithBook = Assignment & {
  bible_books: { name: string; abbreviation: string } | null;
};

type ObservationWithProfile = Observation & {
  profiles: { display_name: string } | null;
};

type PassageResult = {
  content: string;
  copyright?: string;
} | null;

const OBSERVATION_CATEGORIES: {
  value: ObservationCategory;
  label: string;
  description: string;
}[] = [
  {
    value: "terms_identification",
    label: "Terms",
    description: "Key words or phrases that stand out",
  },
  {
    value: "who",
    label: "Who",
    description: "People mentioned - author, audience, characters",
  },
  {
    value: "cause_effect",
    label: "Cause & Effect",
    description: "Logical connections and results",
  },
  { value: "place", label: "Place", description: "Geographic references" },
  {
    value: "define_terms",
    label: "Definitions",
    description: "Define important terms",
  },
  {
    value: "things_emphasized",
    label: "Emphasized",
    description: "What the author emphasizes",
  },
  {
    value: "things_repeated",
    label: "Repeated",
    description: "Recurring themes, words, or ideas",
  },
  {
    value: "things_related",
    label: "Related",
    description: "Connected concepts or ideas",
  },
  {
    value: "things_alike",
    label: "Alike",
    description: "Similarities and comparisons",
  },
  {
    value: "things_unlike",
    label: "Unlike",
    description: "Contrasts and differences",
  },
  {
    value: "true_to_life",
    label: "True to Life",
    description: "Real-world applications and parallels",
  },
  { value: "question", label: "Question", description: "Questions that arise" },
  {
    value: "application",
    label: "Application",
    description: "How does this apply to life?",
  },
  {
    value: "cross_reference",
    label: "Cross Reference",
    description: "Related passages elsewhere",
  },
  { value: "general_note", label: "General", description: "Other observations" },
];

export default function StudyPage() {
  const params = useParams();
  const groupId = params.groupId as string;
  const assignmentId = params.assignmentId as string;
  const { user, profile } = useAuthStore();
  const queryClient = useQueryClient();
  const apiKey = profile?.api_bible_key;
  const passageRef = useRef<HTMLDivElement>(null);

  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [showObservationForm, setShowObservationForm] = useState(false);
  const [observationContent, setObservationContent] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<ObservationCategory>("general_note");
  const [showMyObservations, setShowMyObservations] = useState(true);
  const [showGroupObservations, setShowGroupObservations] = useState(true);
  const [selectedBibleId, setSelectedBibleId] = useState(DEFAULT_BIBLE_ID);
  const [bibleDropdownOpen, setBibleDropdownOpen] = useState(false);
  const [bibleSearchQuery, setBibleSearchQuery] = useState("");
  const bibleDropdownRef = useRef<HTMLDivElement>(null);

  // Close Bible dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bibleDropdownRef.current && !bibleDropdownRef.current.contains(e.target as Node)) {
        setBibleDropdownOpen(false);
        setBibleSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch available Bibles
  const { data: bibles } = useQuery({
    queryKey: ["bibles", apiKey],
    queryFn: async () => {
      if (!apiKey) return null;
      return getBibles(apiKey);
    },
    enabled: !!apiKey,
  });

  // Filter to English Bibles for the dropdown
  const englishBibles = bibles?.filter(b => b.language.id === "eng") || [];

  // Filter bibles by search query
  const filteredBibles = englishBibles.filter(bible =>
    bible.name.toLowerCase().includes(bibleSearchQuery.toLowerCase()) ||
    bible.abbreviation.toLowerCase().includes(bibleSearchQuery.toLowerCase())
  );

  // Get selected Bible info for display
  const selectedBible = englishBibles.find(b => b.id === selectedBibleId);

  // Handle verse click in passage
  const handlePassageClick = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    // Look for verse number elements (API.Bible typically uses .v class or data-vid attribute)
    const verseEl = target.closest('[data-vid], .v, .verse-num');
    if (verseEl) {
      // Try to extract verse number
      const vid = verseEl.getAttribute('data-vid');
      const text = verseEl.textContent || '';
      let verseNum: number | null = null;

      if (vid) {
        // Extract verse from data-vid (format like "GEN.1.1")
        const parts = vid.split('.');
        verseNum = parseInt(parts[parts.length - 1], 10);
      } else {
        // Try to parse from text content
        const match = text.match(/(\d+)/);
        if (match) verseNum = parseInt(match[1], 10);
      }

      if (verseNum && !isNaN(verseNum)) {
        setSelectedVerse(verseNum);
        setShowObservationForm(true);
      }
    }
  }, []);

  // Attach click handler to passage content
  useEffect(() => {
    const el = passageRef.current;
    if (el) {
      el.addEventListener('click', handlePassageClick);
      return () => el.removeEventListener('click', handlePassageClick);
    }
  }, [handlePassageClick]);

  // Fetch assignment
  const { data: assignment } = useQuery({
    queryKey: ["assignment", assignmentId],
    queryFn: async (): Promise<AssignmentWithBook | null> => {
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
        .eq("id", assignmentId)
        .single();

      if (error) throw error;
      return data as AssignmentWithBook;
    },
  });

  // Fetch passage from API.Bible
  const { data: passage, isLoading: passageLoading } = useQuery({
    queryKey: ["passage", apiKey, selectedBibleId, assignment?.bible_books?.abbreviation, assignment?.start_chapter, assignment?.start_verse, assignment?.end_chapter, assignment?.end_verse],
    queryFn: async (): Promise<PassageResult> => {
      if (!assignment?.bible_books?.abbreviation || !apiKey) return null;

      const passageId = buildPassageId(
        assignment.bible_books.abbreviation,
        assignment.start_chapter,
        assignment.start_verse,
        assignment.end_chapter,
        assignment.end_verse
      );

      return getPassage(apiKey, selectedBibleId, passageId, {
        contentType: "html",
        includeVerseNumbers: true,
      });
    },
    enabled: !!assignment?.bible_books?.abbreviation && !!apiKey,
  });

  // Fetch observations
  const { data: observations } = useQuery({
    queryKey: ["study-observations", assignmentId],
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
        .order("start_verse")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as ObservationWithProfile[]) || [];
    },
  });

  // Add observation mutation
  const addObservationMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !assignment || selectedVerse === null) {
        throw new Error("Missing required data");
      }

      const newObservation: ObservationInsert = {
        user_id: user.id,
        assignment_id: assignmentId,
        group_id: groupId,
        book_id: assignment.start_book_id,
        chapter: assignment.start_chapter, // Simplified - assumes single chapter
        start_verse: selectedVerse,
        category: selectedCategory,
        content: observationContent,
        is_private: false,
      };

      const { error } = await supabase.from("observations").insert(newObservation as never);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["study-observations", assignmentId],
      });
      queryClient.invalidateQueries({
        queryKey: ["assignment-observations", assignmentId],
      });
      setObservationContent("");
      setShowObservationForm(false);
      setSelectedVerse(null);
    },
  });

  const myObservations = observations?.filter((o) => o.user_id === user?.id);
  const groupObservations = observations?.filter((o) => o.user_id !== user?.id);

  // Generate verse numbers for the passage
  const verseNumbers: number[] = [];
  if (assignment) {
    for (let v = assignment.start_verse; v <= assignment.end_verse; v++) {
      verseNumbers.push(v);
    }
  }

  const getObservationsForVerse = (verse: number) =>
    observations?.filter((o) => o.start_verse === verse);

  return (
    <div className="max-w-6xl mx-auto">
      <Link
        href={`/groups/${groupId}/assignments/${assignmentId}/`}
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to assignment
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{assignment?.title}</h1>
        <p className="text-lg text-blue-600">
          {assignment?.bible_books?.name} {assignment?.start_chapter}:
          {assignment?.start_verse}-{assignment?.end_verse}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Passage Panel */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
                  Scripture
                </CardTitle>
                {englishBibles.length > 0 && (
                  <div ref={bibleDropdownRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setBibleDropdownOpen(!bibleDropdownOpen)}
                      className="flex items-center gap-2 text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-0 max-w-[180px]"
                    >
                      <span className="truncate">
                        {selectedBible?.abbreviation || "Select"}
                      </span>
                      <ChevronDown className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${bibleDropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    {bibleDropdownOpen && (
                      <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                        <div className="p-2 border-b border-gray-100">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                              type="text"
                              value={bibleSearchQuery}
                              onChange={(e) => setBibleSearchQuery(e.target.value)}
                              placeholder="Search translations..."
                              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              autoFocus
                            />
                          </div>
                        </div>
                        <div className="max-h-64 overflow-y-auto py-1">
                          {filteredBibles.length > 0 ? (
                            filteredBibles.map((bible) => (
                              <button
                                key={bible.id}
                                type="button"
                                onClick={() => {
                                  setSelectedBibleId(bible.id);
                                  setBibleDropdownOpen(false);
                                  setBibleSearchQuery("");
                                }}
                                className={`w-full flex items-start gap-3 px-3 py-2 text-left hover:bg-gray-50 ${
                                  bible.id === selectedBibleId ? "bg-blue-50" : ""
                                }`}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm text-gray-900">
                                    {bible.abbreviation}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate">
                                    {bible.name}
                                  </div>
                                </div>
                                {bible.id === selectedBibleId && (
                                  <Check className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                )}
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-4 text-sm text-gray-500 text-center">
                              No translations found
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {passageLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-6 bg-gray-100 rounded animate-pulse"
                    />
                  ))}
                </div>
              ) : passage?.content ? (
                <div
                  ref={passageRef}
                  className="prose prose-sm max-w-none bible-text passage-clickable"
                  dangerouslySetInnerHTML={{ __html: passage.content }}
                />
              ) : !apiKey ? (
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">
                    To view Bible text, you need to configure your API.Bible key.
                  </p>
                  <p className="text-sm text-gray-400 mb-4">
                    Get a free API key at{" "}
                    <a
                      href="https://scripture.api.bible/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      scripture.api.bible
                    </a>
                  </p>
                  <Link href="/settings/">
                    <Button variant="primary">
                      <Settings className="h-4 w-4 mr-2" />
                      Configure API Key
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">
                    Unable to load Bible text. Please check your API key in settings.
                  </p>
                  <p className="text-sm text-gray-400">
                    Verses: {assignment?.start_chapter}:{assignment?.start_verse}
                    -{assignment?.end_verse}
                  </p>
                </div>
              )}

              {passage?.copyright && (
                <p className="text-xs text-gray-400 mt-4 border-t pt-4">
                  {passage.copyright}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Verse selector for adding observations */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Add Observation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Verse
                </label>
                <div className="flex flex-wrap gap-2">
                  {verseNumbers.map((verse) => {
                    const verseObsCount =
                      getObservationsForVerse(verse)?.length || 0;
                    return (
                      <button
                        key={verse}
                        onClick={() => {
                          setSelectedVerse(verse);
                          setShowObservationForm(true);
                        }}
                        className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedVerse === verse
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        v{verse}
                        {verseObsCount > 0 && (
                          <span className="absolute -top-1 -right-1 h-4 w-4 text-xs bg-green-500 text-white rounded-full flex items-center justify-center">
                            {verseObsCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {showObservationForm && selectedVerse !== null && (
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">
                      Observation for verse {selectedVerse}
                    </h4>
                    <button
                      onClick={() => {
                        setShowObservationForm(false);
                        setSelectedVerse(null);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) =>
                        setSelectedCategory(e.target.value as ObservationCategory)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {OBSERVATION_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label} - {cat.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Observation
                    </label>
                    <textarea
                      value={observationContent}
                      onChange={(e) => setObservationContent(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Write your observation here..."
                    />
                  </div>

                  <Button
                    onClick={() => addObservationMutation.mutate()}
                    disabled={
                      !observationContent.trim() ||
                      addObservationMutation.isPending
                    }
                    isLoading={addObservationMutation.isPending}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Observation
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Observations Panel */}
        <div className="space-y-6">
          {/* My Observations */}
          <Card>
            <CardHeader
              className="cursor-pointer"
              onClick={() => setShowMyObservations(!showMyObservations)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2 text-blue-600" />
                  My Observations ({myObservations?.length || 0})
                </CardTitle>
                {showMyObservations ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </CardHeader>
            {showMyObservations && (
              <CardContent>
                {myObservations && myObservations.length > 0 ? (
                  <div className="space-y-4">
                    {myObservations.map((obs) => (
                      <div key={obs.id} className="p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-medium text-blue-600 bg-white px-2 py-1 rounded">
                              v{obs.start_verse}
                            </span>
                            <span className="text-xs text-gray-500 capitalize">
                              {obs.category.replace(/_/g, " ")}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700">{obs.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    You haven&apos;t added any observations yet
                  </p>
                )}
              </CardContent>
            )}
          </Card>

          {/* Group Observations */}
          <Card>
            <CardHeader
              className="cursor-pointer"
              onClick={() => setShowGroupObservations(!showGroupObservations)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2 text-green-600" />
                  Group Observations ({groupObservations?.length || 0})
                </CardTitle>
                {showGroupObservations ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </CardHeader>
            {showGroupObservations && (
              <CardContent>
                {groupObservations && groupObservations.length > 0 ? (
                  <div className="space-y-4">
                    {groupObservations.map((obs) => (
                      <div key={obs.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-medium text-blue-600 bg-white px-2 py-1 rounded border">
                              v{obs.start_verse}
                            </span>
                            <span className="text-xs text-gray-500 capitalize">
                              {obs.category.replace(/_/g, " ")}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">
                            {obs.profiles?.display_name}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{obs.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    No observations from other group members yet
                  </p>
                )}
              </CardContent>
            )}
          </Card>

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle>Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <a
                  href={`https://www.blueletterbible.org/kjv/${assignment?.bible_books?.abbreviation?.toLowerCase()}/${assignment?.start_chapter}/${assignment?.start_verse}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="text-sm font-medium">Blue Letter Bible</span>
                  <ExternalLink className="h-4 w-4 text-gray-400" />
                </a>
                <Link
                  href="/dictionary/"
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="text-sm font-medium">
                    Strong&apos;s Dictionary
                  </span>
                  <ExternalLink className="h-4 w-4 text-gray-400" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
