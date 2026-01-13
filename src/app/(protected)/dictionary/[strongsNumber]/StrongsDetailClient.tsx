"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ArrowLeft, ExternalLink, BookOpen, Copy, Check } from "lucide-react";
import { useState } from "react";
import type { StrongsEntry } from "@/types/database";

export default function StrongsDetailPage() {
  const params = useParams();
  const strongsNumber = (params.strongsNumber as string).toUpperCase();
  const [copied, setCopied] = useState(false);

  const { data: entry, isLoading } = useQuery({
    queryKey: ["strongs-entry", strongsNumber],
    queryFn: async (): Promise<StrongsEntry | null> => {
      const { data, error } = await supabase
        .from("strongs_entries")
        .select("*")
        .eq("strongs_number", strongsNumber)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const getBlueLetterBibleUrl = (num: string) => {
    const lower = num.toLowerCase();
    const isHebrew = lower.startsWith("h");
    const textVersion = isHebrew ? "wlc" : "tr";
    return `https://www.blueletterbible.org/lexicon/${lower}/kjv/${textVersion}/0-1/`;
  };

  const copyToClipboard = () => {
    if (entry) {
      const text = `${entry.strongs_number} - ${entry.original_word} (${entry.transliteration}): ${entry.short_definition}`;
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Entry not found
        </h2>
        <p className="text-gray-500 mb-6">
          Strong&apos;s number &quot;{strongsNumber}&quot; was not found in the
          database.
        </p>
        <Link href="/dictionary/">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dictionary
          </Button>
        </Link>
      </div>
    );
  }

  const isGreek = entry.language === "greek";

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/dictionary/"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Dictionary
      </Link>

      {/* Main Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <span
                  className={`font-mono font-bold text-2xl ${
                    isGreek ? "text-blue-600" : "text-amber-600"
                  }`}
                >
                  {entry.strongs_number}
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    isGreek
                      ? "bg-blue-100 text-blue-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {isGreek ? "Greek (NT)" : "Hebrew (OT)"}
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-4xl font-serif">
                  {entry.original_word}
                </span>
                <div>
                  <p className="text-lg text-gray-700 italic">
                    {entry.transliteration}
                  </p>
                  {entry.pronunciation && (
                    <p className="text-sm text-gray-500">
                      Pronounced: {entry.pronunciation}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={copyToClipboard}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Copy to clipboard"
              >
                {copied ? (
                  <Check className="h-5 w-5 text-green-600" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Short Definition */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                Definition
              </h3>
              <p className="text-lg text-gray-900">{entry.short_definition}</p>
            </div>

            {/* Long Definition */}
            {entry.long_definition && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  Extended Definition
                </h3>
                <p className="text-gray-700">{entry.long_definition}</p>
              </div>
            )}

            {/* Derivation */}
            {entry.derivation && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  Etymology / Derivation
                </h3>
                <p className="text-gray-700">{entry.derivation}</p>
              </div>
            )}

            {/* KJV Usage */}
            {entry.kjv_usage && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  KJV Translation(s)
                </h3>
                <p className="text-gray-700">{entry.kjv_usage}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* External Resources */}
      <Card>
        <CardHeader>
          <CardTitle>External Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <a
              href={getBlueLetterBibleUrl(entry.strongs_number)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <div>
                <p className="font-medium text-blue-900">Blue Letter Bible</p>
                <p className="text-sm text-blue-700">
                  Full lexicon entry with cross-references
                </p>
              </div>
              <ExternalLink className="h-5 w-5 text-blue-600" />
            </a>

            <a
              href={`https://biblehub.com/${isGreek ? "greek" : "hebrew"}/${entry.strongs_number.slice(1)}.htm`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div>
                <p className="font-medium text-gray-900">Bible Hub</p>
                <p className="text-sm text-gray-600">
                  Concordance and word study
                </p>
              </div>
              <ExternalLink className="h-5 w-5 text-gray-500" />
            </a>

            <a
              href={`https://www.studylight.org/lexicons/eng/${isGreek ? "greek" : "hebrew"}/${entry.strongs_number.slice(1)}.html`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div>
                <p className="font-medium text-gray-900">Study Light</p>
                <p className="text-sm text-gray-600">
                  Multiple lexicon sources
                </p>
              </div>
              <ExternalLink className="h-5 w-5 text-gray-500" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
