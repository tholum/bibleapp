"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Search, BookOpen, ExternalLink } from "lucide-react";
import type { StrongsEntry } from "@/types/database";

export default function DictionaryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLanguage, setSearchLanguage] = useState<
    "all" | "hebrew" | "greek"
  >("all");

  const { data: results, isLoading } = useQuery({
    queryKey: ["strongs-search", searchTerm, searchLanguage],
    queryFn: async (): Promise<StrongsEntry[]> => {
      if (!searchTerm || searchTerm.length < 2) return [];

      let query = supabase
        .from("strongs_entries")
        .select("*")
        .or(
          `strongs_number.ilike.%${searchTerm}%,transliteration.ilike.%${searchTerm}%,short_definition.ilike.%${searchTerm}%`
        )
        .limit(50);

      if (searchLanguage !== "all") {
        query = query.eq("language", searchLanguage);
      }

      const { data, error } = await query.order("strongs_number");

      if (error) throw error;
      return (data as StrongsEntry[]) || [];
    },
    enabled: searchTerm.length >= 2,
  });

  const getBlueLetterBibleUrl = (strongsNumber: string) => {
    const num = strongsNumber.toLowerCase();
    const isHebrew = num.startsWith("h");
    const textVersion = isHebrew ? "wlc" : "tr";
    return `https://www.blueletterbible.org/lexicon/${num}/kjv/${textVersion}/0-1/`;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Strong&apos;s Concordance
        </h1>
        <p className="text-gray-600 mt-1">
          Search for Greek and Hebrew word definitions
        </p>
      </div>

      {/* Search */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Strong's number (G26, H430) or word..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={searchLanguage}
              onChange={(e) =>
                setSearchLanguage(e.target.value as "all" | "hebrew" | "greek")
              }
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Languages</option>
              <option value="greek">Greek (NT)</option>
              <option value="hebrew">Hebrew (OT)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {searchTerm.length < 2 ? (
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            Enter at least 2 characters to search
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Try searching for &quot;G26&quot; (agape - love) or
            &quot;H430&quot; (Elohim - God)
          </p>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : results && results.length > 0 ? (
        <div className="space-y-4">
          {results.map((entry) => (
            <Card
              key={entry.id}
              className="hover:border-blue-300 transition-colors"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span
                        className={`font-mono font-bold text-lg ${
                          entry.language === "greek"
                            ? "text-blue-600"
                            : "text-amber-600"
                        }`}
                      >
                        {entry.strongs_number}
                      </span>
                      <span className="text-2xl">{entry.original_word}</span>
                      <span className="text-gray-500 italic">
                        {entry.transliteration}
                      </span>
                      {entry.pronunciation && (
                        <span className="text-gray-400 text-sm">
                          ({entry.pronunciation})
                        </span>
                      )}
                    </div>
                    <p className="text-gray-900 font-medium mb-2">
                      {entry.short_definition}
                    </p>
                    {entry.long_definition && (
                      <p className="text-gray-600 text-sm line-clamp-2">
                        {entry.long_definition}
                      </p>
                    )}
                    {entry.kjv_usage && (
                      <p className="text-xs text-gray-500 mt-2">
                        <span className="font-medium">KJV Usage:</span>{" "}
                        {entry.kjv_usage}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Link
                      href={`/dictionary/${entry.strongs_number}/`}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <BookOpen className="h-5 w-5" />
                    </Link>
                    <a
                      href={getBlueLetterBibleUrl(entry.strongs_number)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <ExternalLink className="h-5 w-5" />
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No results found for &quot;{searchTerm}&quot;</p>
          <p className="text-sm text-gray-400 mt-2">
            Try a different search term or Strong&apos;s number
          </p>
        </div>
      )}

      {/* Quick Reference */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Quick Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                Common Greek Words
              </h4>
              <div className="space-y-1">
                {[
                  { num: "G26", word: "agape", def: "love" },
                  { num: "G4102", word: "pistis", def: "faith" },
                  { num: "G5485", word: "charis", def: "grace" },
                  { num: "G3056", word: "logos", def: "word" },
                ].map((item) => (
                  <Link
                    key={item.num}
                    href={`/dictionary/${item.num}/`}
                    className="block text-sm text-gray-600 hover:text-blue-600"
                  >
                    <span className="font-mono text-blue-600">{item.num}</span>{" "}
                    - {item.word} ({item.def})
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                Common Hebrew Words
              </h4>
              <div className="space-y-1">
                {[
                  { num: "H430", word: "elohim", def: "God" },
                  { num: "H3068", word: "YHWH", def: "LORD" },
                  { num: "H7965", word: "shalom", def: "peace" },
                  { num: "H157", word: "ahab", def: "love" },
                ].map((item) => (
                  <Link
                    key={item.num}
                    href={`/dictionary/${item.num}/`}
                    className="block text-sm text-gray-600 hover:text-amber-600"
                  >
                    <span className="font-mono text-amber-600">{item.num}</span>{" "}
                    - {item.word} ({item.def})
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
