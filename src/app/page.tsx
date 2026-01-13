"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/Button";
import { BookOpen, Users, Lightbulb, ChevronRight } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/dashboard/");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="py-6 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
            <span className="font-bold text-xl text-gray-900">
              Community Bible Study
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/login/">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/signup/">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Study the Bible Together
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            A collaborative Bible study app based on the{" "}
            <strong>&quot;Living By the Book&quot;</strong> methodology.
            Make observations, share insights, and grow together.
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Link href="/signup/">
              <Button size="lg">
                Start Studying
                <ChevronRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
            <Link href="/login/">
              <Button variant="outline" size="lg">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <div className="p-3 bg-blue-100 rounded-lg w-fit mb-4">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Study Groups
            </h3>
            <p className="text-gray-600">
              Create or join study groups with friends. Work through
              passages together with weekly assignments.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <div className="p-3 bg-green-100 rounded-lg w-fit mb-4">
              <Lightbulb className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Structured Observations
            </h3>
            <p className="text-gray-600">
              Make observations using proven categories: Terms, Who, Place,
              Cause &amp; Effect, and more from &quot;Living By the Book.&quot;
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <div className="p-3 bg-purple-100 rounded-lg w-fit mb-4">
              <BookOpen className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Word Studies
            </h3>
            <p className="text-gray-600">
              Dive deeper with Strong&apos;s Concordance integration.
              Look up Greek and Hebrew definitions right in the app.
            </p>
          </div>
        </div>

        {/* Observation Categories */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Observation Categories
          </h2>
          <p className="text-gray-600 text-center mb-8 max-w-2xl mx-auto">
            Based on the &quot;Living By the Book&quot; methodology by Howard
            Hendricks, our structured approach helps you dig deeper into
            Scripture.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              "Terms & Definitions",
              "Who (People)",
              "Place (Geography)",
              "Cause & Effect",
              "Things Emphasized",
              "Things Repeated",
              "Things Related",
              "Things Alike/Unlike",
              "True to Life",
              "Questions",
              "Applications",
              "Cross References",
            ].map((category) => (
              <div
                key={category}
                className="px-4 py-3 bg-gray-50 rounded-lg text-sm font-medium text-gray-700 text-center"
              >
                {category}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-blue-600 rounded-xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-blue-100 mb-8 max-w-xl mx-auto">
            Join thousands of believers studying God&apos;s Word together.
            Create an account in seconds and start your first study group today.
          </p>
          <Link href="/signup/">
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-blue-50"
            >
              Create Free Account
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-200 mt-16">
        <div className="max-w-6xl mx-auto text-center text-gray-500 text-sm">
          <p>Community Bible Study - Study God&apos;s Word Together</p>
        </div>
      </footer>
    </div>
  );
}
