"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Settings,
  Key,
  User,
  ExternalLink,
  Check,
  AlertCircle,
} from "lucide-react";
import type { Profile } from "@/types/database";

export default function SettingsPage() {
  const { user, profile, setProfile } = useAuthStore();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [apiBibleKey, setApiBibleKey] = useState(profile?.api_bible_key || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setApiBibleKey(profile.api_bible_key || "");
      setBio(profile.bio || "");
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: {
      display_name?: string;
      bio?: string | null;
      api_bible_key?: string | null;
    }): Promise<Profile> => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("profiles")
        .update(updates as never)
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data as Profile;
    },
    onSuccess: (data) => {
      setProfile(data);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    },
    onError: () => {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    },
  });

  const handleSaveProfile = () => {
    setSaveStatus("saving");
    updateProfileMutation.mutate({
      display_name: displayName,
      bio: bio || null,
    });
  };

  const handleSaveApiKey = () => {
    setSaveStatus("saving");
    updateProfileMutation.mutate({
      api_bible_key: apiBibleKey || null,
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Settings className="h-6 w-6 mr-2" />
          Settings
        </h1>
        <p className="text-gray-600 mt-1">
          Manage your profile and API configuration.
        </p>
      </div>

      {/* Profile Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2 text-gray-500" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Email cannot be changed
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Your display name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Tell others about yourself (optional)"
            />
          </div>

          <Button
            onClick={handleSaveProfile}
            disabled={updateProfileMutation.isPending || !displayName.trim()}
            className="w-full"
          >
            {saveStatus === "saving" && "Saving..."}
            {saveStatus === "saved" && (
              <>
                <Check className="h-4 w-4 mr-2" />
                Saved!
              </>
            )}
            {saveStatus === "error" && (
              <>
                <AlertCircle className="h-4 w-4 mr-2" />
                Error saving
              </>
            )}
            {saveStatus === "idle" && "Save Profile"}
          </Button>
        </CardContent>
      </Card>

      {/* API.Bible Key Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Key className="h-5 w-5 mr-2 text-gray-500" />
            API.Bible Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800 mb-2">
              <strong>Why do I need an API key?</strong>
            </p>
            <p className="text-sm text-blue-700">
              The API.Bible key allows the app to fetch Bible passages directly.
              Your key is stored securely and only accessible after you sign in.
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-900 mb-2">
              How to get your free API key:
            </p>
            <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1">
              <li>
                Visit{" "}
                <a
                  href="https://scripture.api.bible/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center"
                >
                  scripture.api.bible
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </li>
              <li>Create a free account</li>
              <li>Create a new app to get your API key</li>
              <li>Copy and paste the key below</li>
            </ol>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API.Bible Key
            </label>
            <input
              type="password"
              value={apiBibleKey}
              onChange={(e) => setApiBibleKey(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
              placeholder="Enter your API.Bible key"
            />
            {profile?.api_bible_key && (
              <p className="text-xs text-green-600 mt-1 flex items-center">
                <Check className="h-3 w-3 mr-1" />
                API key configured
              </p>
            )}
          </div>

          <Button
            onClick={handleSaveApiKey}
            disabled={updateProfileMutation.isPending}
            className="w-full"
          >
            {updateProfileMutation.isPending ? "Saving..." : "Save API Key"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
