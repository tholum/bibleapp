"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  ChevronDown,
  Search,
  Check,
  X,
  MessageSquare,
  BookOpen,
  Users,
  PanelRightClose,
  PanelRight,
} from "lucide-react";
import { getPassage, getBibles, buildPassageId, DEFAULT_BIBLE_ID } from "@/lib/api-bible/client";
import type { ObservationCategory, Assignment, Observation, ObservationInsert } from "@/types/database";

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

type ContextMenuState = {
  visible: boolean;
  x: number;
  y: number;
  word: string;
  verse: number | null;
};

const OBSERVATION_CATEGORIES: {
  value: ObservationCategory;
  label: string;
}[] = [
  { value: "terms_identification", label: "Terms" },
  { value: "who", label: "Who" },
  { value: "cause_effect", label: "Cause & Effect" },
  { value: "place", label: "Place" },
  { value: "define_terms", label: "Definitions" },
  { value: "things_emphasized", label: "Emphasized" },
  { value: "things_repeated", label: "Repeated" },
  { value: "things_related", label: "Related" },
  { value: "things_alike", label: "Alike" },
  { value: "things_unlike", label: "Unlike" },
  { value: "true_to_life", label: "True to Life" },
  { value: "question", label: "Question" },
  { value: "application", label: "Application" },
  { value: "cross_reference", label: "Cross Reference" },
  { value: "general_note", label: "General" },
];

export default function FocusedStudyPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const assignmentId = params.assignmentId as string;
  const { user, profile } = useAuthStore();
  const queryClient = useQueryClient();
  const apiKey = profile?.api_bible_key;
  const passageRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // UI State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [selectedBibleId, setSelectedBibleId] = useState(DEFAULT_BIBLE_ID);
  const [bibleDropdownOpen, setBibleDropdownOpen] = useState(false);
  const [bibleSearchQuery, setBibleSearchQuery] = useState("");
  const bibleDropdownRef = useRef<HTMLDivElement>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    word: "",
    verse: null,
  });

  // Observation Form State
  const [showObservationForm, setShowObservationForm] = useState(false);
  const [observationType, setObservationType] = useState<"verse" | "word">("verse");
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [selectedWord, setSelectedWord] = useState<string>("");
  const [observationContent, setObservationContent] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ObservationCategory>("general_note");

  // View toggle for observations
  const [observationView, setObservationView] = useState<"all" | "my" | "group">("all");

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  // Handle right-click on passage
  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();

    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() || "";

    // Find the word under cursor if no selection
    let word = selectedText;
    if (!word) {
      const range = document.caretRangeFromPoint(e.clientX, e.clientY);
      if (range) {
        const textNode = range.startContainer;
        if (textNode.nodeType === Node.TEXT_NODE) {
          const text = textNode.textContent || "";
          const offset = range.startOffset;

          // Find word boundaries
          let start = offset;
          let end = offset;

          while (start > 0 && /\w/.test(text[start - 1])) start--;
          while (end < text.length && /\w/.test(text[end])) end++;

          word = text.slice(start, end);
        }
      }
    }

    // Clean the word (remove punctuation)
    word = word.replace(/[.,;:!?"'()\[\]{}]/g, "").trim();

    if (!word) return;

    // Find verse number
    let verse: number | null = null;
    const target = e.target as HTMLElement;

    // Look for verse number in parent elements
    let current: HTMLElement | null = target;
    while (current && current !== passageRef.current) {
      const vid = current.getAttribute("data-vid");
      if (vid) {
        const parts = vid.split(".");
        verse = parseInt(parts[parts.length - 1], 10);
        break;
      }
      const prevSibling = current.previousElementSibling;
      if (prevSibling?.classList.contains("v")) {
        const match = prevSibling.textContent?.match(/(\d+)/);
        if (match) {
          verse = parseInt(match[1], 10);
          break;
        }
      }
      current = current.parentElement;
    }

    // If still no verse, try to find nearest verse marker
    if (!verse) {
      const verseElements = passageRef.current?.querySelectorAll(".v");
      if (verseElements) {
        let lastVerse = 1;
        verseElements.forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.top < e.clientY) {
            const match = el.textContent?.match(/(\d+)/);
            if (match) lastVerse = parseInt(match[1], 10);
          }
        });
        verse = lastVerse;
      }
    }

    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      word,
      verse,
    });
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

  const englishBibles = bibles?.filter(b => b.language.id === "eng") || [];
  const filteredBibles = englishBibles.filter(bible =>
    bible.name.toLowerCase().includes(bibleSearchQuery.toLowerCase()) ||
    bible.abbreviation.toLowerCase().includes(bibleSearchQuery.toLowerCase())
  );
  const selectedBible = englishBibles.find(b => b.id === selectedBibleId);

  // Fetch assignment
  const { data: assignment } = useQuery({
    queryKey: ["assignment", assignmentId],
    queryFn: async (): Promise<AssignmentWithBook | null> => {
      const { data, error } = await supabase
        .from("assignments")
        .select(`
          *,
          bible_books!assignments_start_book_id_fkey (
            name,
            abbreviation
          )
        `)
        .eq("id", assignmentId)
        .single();

      if (error) throw error;
      return data as AssignmentWithBook;
    },
  });

  // Fetch passage
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

  // Attach context menu handler - re-attach when passage loads
  useEffect(() => {
    const el = passageRef.current;
    if (el && passage?.content) {
      el.addEventListener("contextmenu", handleContextMenu);
      return () => el.removeEventListener("contextmenu", handleContextMenu);
    }
  }, [handleContextMenu, passage?.content]);

  // Fetch observations
  const { data: observations } = useQuery({
    queryKey: ["study-observations", assignmentId],
    queryFn: async (): Promise<ObservationWithProfile[]> => {
      const { data, error } = await supabase
        .from("observations")
        .select(`
          *,
          profiles (
            display_name
          )
        `)
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
        chapter: assignment.start_chapter,
        start_verse: selectedVerse,
        category: selectedCategory,
        content: observationContent,
        selected_word: observationType === "word" ? selectedWord : null,
        bible_version_id: selectedBibleId,
        bible_version_name: selectedBible?.abbreviation || null,
        is_private: false,
      };

      const { error } = await supabase.from("observations").insert(newObservation as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study-observations", assignmentId] });
      resetObservationForm();
    },
  });

  const resetObservationForm = () => {
    setObservationContent("");
    setShowObservationForm(false);
    setSelectedVerse(null);
    setSelectedWord("");
    setObservationType("verse");
  };

  const handleContextMenuAction = (type: "verse" | "word") => {
    setObservationType(type);
    setSelectedVerse(contextMenu.verse);
    setSelectedWord(type === "word" ? contextMenu.word : "");
    setShowObservationForm(true);
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const myObservations = observations?.filter(o => o.user_id === user?.id) || [];
  const groupObservations = observations?.filter(o => o.user_id !== user?.id) || [];
  const allObservations = observations || [];
  const displayedObservations = observationView === "all"
    ? allObservations
    : observationView === "my"
      ? myObservations
      : groupObservations;

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-gray-100">
      {/* Top Bar */}
      <header className="h-12 flex items-center justify-between px-4 bg-gray-800 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/groups/${groupId}/assignments/${assignmentId}/`)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Exit Study</span>
          </button>
          <div className="h-4 w-px bg-gray-700" />
          <div className="text-sm">
            <span className="text-gray-400">{assignment?.title}</span>
            <span className="mx-2 text-gray-600">|</span>
            <span className="text-blue-400">
              {assignment?.bible_books?.name} {assignment?.start_chapter}:{assignment?.start_verse}-{assignment?.end_verse}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Bible Version Selector */}
          {englishBibles.length > 0 && (
            <div ref={bibleDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setBibleDropdownOpen(!bibleDropdownOpen)}
                className="flex items-center gap-2 text-sm px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                <BookOpen className="h-4 w-4 text-gray-400" />
                <span>{selectedBible?.abbreviation || "Select"}</span>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${bibleDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {bibleDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-72 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                  <div className="p-2 border-b border-gray-700">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                      <input
                        type="text"
                        value={bibleSearchQuery}
                        onChange={(e) => setBibleSearchQuery(e.target.value)}
                        placeholder="Search translations..."
                        className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-500"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1">
                    {filteredBibles.map((bible) => (
                      <button
                        key={bible.id}
                        type="button"
                        onClick={() => {
                          setSelectedBibleId(bible.id);
                          setBibleDropdownOpen(false);
                          setBibleSearchQuery("");
                        }}
                        className={`w-full flex items-start gap-3 px-3 py-2 text-left hover:bg-gray-700 ${
                          bible.id === selectedBibleId ? "bg-gray-700" : ""
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-white">{bible.abbreviation}</div>
                          <div className="text-xs text-gray-400 truncate">{bible.name}</div>
                        </div>
                        {bible.id === selectedBibleId && (
                          <Check className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setShowRightPanel(!showRightPanel)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title={showRightPanel ? "Hide panel" : "Show panel"}
          >
            {showRightPanel ? <PanelRightClose className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Scripture Panel */}
        <div className={`flex flex-col bg-gray-850 transition-all duration-300 ${
          isFullscreen || !showRightPanel ? "w-full" : "w-1/2"
        }`}>
          <div className="flex-1 overflow-y-auto p-6 lg:p-8">
            {passageLoading ? (
              <div className="space-y-3 max-w-3xl mx-auto">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-6 bg-gray-800 rounded animate-pulse" />
                ))}
              </div>
            ) : passage?.content ? (
              <div
                ref={passageRef}
                className="prose prose-invert prose-lg max-w-3xl mx-auto bible-text-dark select-text cursor-text"
                dangerouslySetInnerHTML={{ __html: passage.content }}
              />
            ) : !apiKey ? (
              <div className="text-center py-12 max-w-md mx-auto">
                <BookOpen className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">Configure your API.Bible key in settings to view Scripture.</p>
                <Link href="/settings/" className="text-blue-400 hover:text-blue-300">
                  Go to Settings
                </Link>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400">Unable to load passage.</p>
              </div>
            )}
          </div>

          {passage?.copyright && (
            <div className="px-6 py-3 text-xs text-gray-500 border-t border-gray-700 text-center">
              {passage.copyright}
            </div>
          )}
        </div>

        {/* Right Panel - Observations & Tools */}
        {showRightPanel && !isFullscreen && (
          <div className="w-1/2 flex flex-col border-l border-gray-700 bg-gray-800">
            {/* Observation Form */}
            {showObservationForm && (
              <div className="p-4 border-b border-gray-700 bg-gray-750">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-white">New Observation</h3>
                    <p className="text-sm text-gray-400">
                      {observationType === "word" ? (
                        <>Word: <span className="text-blue-400">&quot;{selectedWord}&quot;</span> in verse {selectedVerse}</>
                      ) : (
                        <>Verse {selectedVerse}</>
                      )}
                      <span className="text-gray-500 ml-2">({selectedBible?.abbreviation})</span>
                    </p>
                  </div>
                  <button
                    onClick={resetObservationForm}
                    className="p-1 text-gray-400 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as ObservationCategory)}
                  className="w-full mb-3 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500"
                >
                  {OBSERVATION_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>

                <textarea
                  value={observationContent}
                  onChange={(e) => setObservationContent(e.target.value)}
                  rows={3}
                  className="w-full mb-3 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Write your observation..."
                  autoFocus
                />

                <button
                  onClick={() => addObservationMutation.mutate()}
                  disabled={!observationContent.trim() || addObservationMutation.isPending}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
                >
                  {addObservationMutation.isPending ? "Saving..." : "Save Observation"}
                </button>
              </div>
            )}

            {/* Observation Tabs */}
            <div className="flex border-b border-gray-700">
              <button
                onClick={() => setObservationView("all")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  observationView === "all"
                    ? "text-purple-400 border-b-2 border-purple-400"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <BookOpen className="h-4 w-4 inline mr-2" />
                All ({allObservations.length})
              </button>
              <button
                onClick={() => setObservationView("my")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  observationView === "my"
                    ? "text-blue-400 border-b-2 border-blue-400"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <MessageSquare className="h-4 w-4 inline mr-2" />
                Mine ({myObservations.length})
              </button>
              <button
                onClick={() => setObservationView("group")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  observationView === "group"
                    ? "text-green-400 border-b-2 border-green-400"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Users className="h-4 w-4 inline mr-2" />
                Group ({groupObservations.length})
              </button>
            </div>

            {/* Observations List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {displayedObservations.length > 0 ? (
                displayedObservations.map(obs => {
                  const isMyObservation = obs.user_id === user?.id;
                  return (
                    <div
                      key={obs.id}
                      className={`p-3 rounded-lg ${
                        isMyObservation ? "bg-blue-900/30 border-l-2 border-blue-500" : "bg-gray-700/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-blue-400 bg-blue-900/50 px-2 py-0.5 rounded">
                            v{obs.start_verse}
                          </span>
                          {obs.selected_word && (
                            <span className="text-xs text-purple-400 bg-purple-900/30 px-2 py-0.5 rounded">
                              &quot;{obs.selected_word}&quot;
                            </span>
                          )}
                          <span className="text-xs text-gray-500 capitalize">
                            {obs.category.replace(/_/g, " ")}
                          </span>
                        </div>
                        {obs.bible_version_name && (
                          <span className="text-xs text-gray-500">{obs.bible_version_name}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-300">{obs.content}</p>
                      {observationView !== "my" && obs.profiles?.display_name && (
                        <p className="text-xs text-gray-500 mt-2">
                          - {obs.profiles.display_name} {isMyObservation && <span className="text-blue-400">(you)</span>}
                        </p>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">
                    {observationView === "my"
                      ? "Right-click on any word to add an observation"
                      : observationView === "all"
                        ? "No observations yet. Right-click on any word to add one."
                        : "No group observations yet"
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[200px]"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 220),
            top: Math.min(contextMenu.y, window.innerHeight - 120),
          }}
        >
          <div className="px-3 py-2 border-b border-gray-700">
            <p className="text-xs text-gray-500">Selected word</p>
            <p className="text-sm font-medium text-white truncate">&quot;{contextMenu.word}&quot;</p>
            {contextMenu.verse && (
              <p className="text-xs text-gray-500 mt-1">Verse {contextMenu.verse}</p>
            )}
          </div>
          <button
            onClick={() => handleContextMenuAction("verse")}
            className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-2"
          >
            <MessageSquare className="h-4 w-4 text-blue-400" />
            Observe Verse {contextMenu.verse}
          </button>
          <button
            onClick={() => handleContextMenuAction("word")}
            className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-2"
          >
            <BookOpen className="h-4 w-4 text-purple-400" />
            Observe Word &quot;{contextMenu.word}&quot;
          </button>
        </div>
      )}
    </div>
  );
}
