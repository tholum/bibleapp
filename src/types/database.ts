export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ObservationCategory =
  | "terms_identification"
  | "who"
  | "cause_effect"
  | "place"
  | "define_terms"
  | "things_emphasized"
  | "things_repeated"
  | "things_related"
  | "things_alike"
  | "things_unlike"
  | "true_to_life"
  | "general_note"
  | "question"
  | "application"
  | "cross_reference";

export type GroupRole = "owner" | "admin" | "member";

export type AssignmentStatus = "draft" | "active" | "completed" | "archived";

export type StrongsLanguage = "hebrew" | "greek";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string;
          avatar_url: string | null;
          bio: string | null;
          api_bible_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name: string;
          avatar_url?: string | null;
          bio?: string | null;
          api_bible_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string;
          avatar_url?: string | null;
          bio?: string | null;
          api_bible_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      bible_books: {
        Row: {
          id: number;
          name: string;
          abbreviation: string;
          testament: "OT" | "NT";
          chapter_count: number;
          canonical_order: number;
        };
        Insert: {
          id: number;
          name: string;
          abbreviation: string;
          testament: "OT" | "NT";
          chapter_count: number;
          canonical_order: number;
        };
        Update: {
          id?: number;
          name?: string;
          abbreviation?: string;
          testament?: "OT" | "NT";
          chapter_count?: number;
          canonical_order?: number;
        };
      };
      strongs_entries: {
        Row: {
          id: number;
          strongs_number: string;
          language: StrongsLanguage;
          original_word: string;
          transliteration: string;
          pronunciation: string | null;
          short_definition: string;
          long_definition: string | null;
          derivation: string | null;
          kjv_usage: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          strongs_number: string;
          language: StrongsLanguage;
          original_word: string;
          transliteration: string;
          pronunciation?: string | null;
          short_definition: string;
          long_definition?: string | null;
          derivation?: string | null;
          kjv_usage?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          strongs_number?: string;
          language?: StrongsLanguage;
          original_word?: string;
          transliteration?: string;
          pronunciation?: string | null;
          short_definition?: string;
          long_definition?: string | null;
          derivation?: string | null;
          kjv_usage?: string | null;
          created_at?: string;
        };
      };
      study_groups: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          cover_image_url: string | null;
          is_public: boolean;
          invite_code: string | null;
          max_members: number;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          cover_image_url?: string | null;
          is_public?: boolean;
          invite_code?: string | null;
          max_members?: number;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          cover_image_url?: string | null;
          is_public?: boolean;
          invite_code?: string | null;
          max_members?: number;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      group_memberships: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          role: GroupRole;
          joined_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          role?: GroupRole;
          joined_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          user_id?: string;
          role?: GroupRole;
          joined_at?: string;
        };
      };
      assignments: {
        Row: {
          id: string;
          group_id: string;
          title: string;
          description: string | null;
          status: AssignmentStatus;
          start_book_id: number;
          start_chapter: number;
          start_verse: number;
          end_book_id: number;
          end_chapter: number;
          end_verse: number;
          observations_per_verse: number;
          due_date: string | null;
          start_date: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          title: string;
          description?: string | null;
          status?: AssignmentStatus;
          start_book_id: number;
          start_chapter: number;
          start_verse: number;
          end_book_id: number;
          end_chapter: number;
          end_verse: number;
          observations_per_verse?: number;
          due_date?: string | null;
          start_date?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          title?: string;
          description?: string | null;
          status?: AssignmentStatus;
          start_book_id?: number;
          start_chapter?: number;
          start_verse?: number;
          end_book_id?: number;
          end_chapter?: number;
          end_verse?: number;
          observations_per_verse?: number;
          due_date?: string | null;
          start_date?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      observations: {
        Row: {
          id: string;
          user_id: string;
          assignment_id: string | null;
          group_id: string | null;
          book_id: number;
          chapter: number;
          start_verse: number;
          end_verse: number | null;
          category: ObservationCategory;
          title: string | null;
          content: string;
          strongs_references: string[] | null;
          selected_word: string | null;
          bible_version_id: string | null;
          bible_version_name: string | null;
          is_private: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          assignment_id?: string | null;
          group_id?: string | null;
          book_id: number;
          chapter: number;
          start_verse: number;
          end_verse?: number | null;
          category: ObservationCategory;
          title?: string | null;
          content: string;
          strongs_references?: string[] | null;
          selected_word?: string | null;
          bible_version_id?: string | null;
          bible_version_name?: string | null;
          is_private?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          assignment_id?: string | null;
          group_id?: string | null;
          book_id?: number;
          chapter?: number;
          start_verse?: number;
          end_verse?: number | null;
          category?: ObservationCategory;
          title?: string | null;
          content?: string;
          strongs_references?: string[] | null;
          selected_word?: string | null;
          bible_version_id?: string | null;
          bible_version_name?: string | null;
          is_private?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_group_member: {
        Args: { group_uuid: string };
        Returns: boolean;
      };
      is_group_admin: {
        Args: { group_uuid: string };
        Returns: boolean;
      };
    };
    Enums: {
      observation_category: ObservationCategory;
      group_role: GroupRole;
      assignment_status: AssignmentStatus;
      strongs_language: StrongsLanguage;
    };
  };
}

// Helper types for easier use
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type BibleBook = Database["public"]["Tables"]["bible_books"]["Row"];
export type StrongsEntry = Database["public"]["Tables"]["strongs_entries"]["Row"];
export type StudyGroup = Database["public"]["Tables"]["study_groups"]["Row"];
export type GroupMembership = Database["public"]["Tables"]["group_memberships"]["Row"];
export type Assignment = Database["public"]["Tables"]["assignments"]["Row"];
export type Observation = Database["public"]["Tables"]["observations"]["Row"];

// Insert types
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type StudyGroupInsert = Database["public"]["Tables"]["study_groups"]["Insert"];
export type GroupMembershipInsert = Database["public"]["Tables"]["group_memberships"]["Insert"];
export type AssignmentInsert = Database["public"]["Tables"]["assignments"]["Insert"];
export type ObservationInsert = Database["public"]["Tables"]["observations"]["Insert"];
