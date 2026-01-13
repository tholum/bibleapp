-- ============================================================
-- Community Bible Study App - Initial Schema
-- ============================================================

-- ============================================================
-- CUSTOM TYPES AND ENUMS
-- ============================================================

-- Observation categories from "Living By the Book" methodology
CREATE TYPE observation_category AS ENUM (
  'terms_identification',
  'who',
  'cause_effect',
  'place',
  'define_terms',
  'things_emphasized',
  'things_repeated',
  'things_related',
  'things_alike',
  'things_unlike',
  'true_to_life',
  'general_note',
  'question',
  'application',
  'cross_reference'
);

-- Group member roles
CREATE TYPE group_role AS ENUM (
  'owner',
  'admin',
  'member'
);

-- Assignment status
CREATE TYPE assignment_status AS ENUM (
  'draft',
  'active',
  'completed',
  'archived'
);

-- Strong's language type
CREATE TYPE strongs_language AS ENUM (
  'hebrew',
  'greek'
);

-- ============================================================
-- UTILITY FUNCTIONS
-- ============================================================

-- Function to generate random invite codes
CREATE OR REPLACE FUNCTION generate_invite_code(length INTEGER DEFAULT 8)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PROFILES TABLE (extends auth.users)
-- ============================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  api_bible_key TEXT, -- User's personal API.Bible key (get free at scripture.api.bible)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_display_name ON public.profiles(display_name);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- BIBLE REFERENCE TABLES
-- ============================================================

CREATE TABLE public.bible_books (
  id SMALLINT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  abbreviation TEXT NOT NULL UNIQUE,
  testament TEXT NOT NULL CHECK (testament IN ('OT', 'NT')),
  chapter_count SMALLINT NOT NULL,
  canonical_order SMALLINT NOT NULL UNIQUE
);

CREATE INDEX idx_bible_books_name ON public.bible_books(name);
CREATE INDEX idx_bible_books_testament ON public.bible_books(testament);

-- ============================================================
-- STRONG'S CONCORDANCE
-- ============================================================

CREATE TABLE public.strongs_entries (
  id SERIAL PRIMARY KEY,
  strongs_number TEXT NOT NULL UNIQUE,
  language strongs_language NOT NULL,
  original_word TEXT NOT NULL,
  transliteration TEXT NOT NULL,
  pronunciation TEXT,
  short_definition TEXT NOT NULL,
  long_definition TEXT,
  derivation TEXT,
  kjv_usage TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_strongs_number ON public.strongs_entries(strongs_number);
CREATE INDEX idx_strongs_language ON public.strongs_entries(language);
CREATE INDEX idx_strongs_transliteration ON public.strongs_entries(transliteration);

-- Full-text search on definitions
CREATE INDEX idx_strongs_definition_fts ON public.strongs_entries
  USING GIN (to_tsvector('english', short_definition || ' ' || COALESCE(long_definition, '')));

-- ============================================================
-- STUDY GROUPS
-- ============================================================

CREATE TABLE public.study_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  invite_code TEXT UNIQUE DEFAULT generate_invite_code(),
  max_members INTEGER DEFAULT 50,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_study_groups_created_by ON public.study_groups(created_by);
CREATE INDEX idx_study_groups_public ON public.study_groups(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_study_groups_invite_code ON public.study_groups(invite_code) WHERE invite_code IS NOT NULL;

CREATE TRIGGER update_study_groups_updated_at
  BEFORE UPDATE ON public.study_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- GROUP MEMBERSHIPS
-- ============================================================

CREATE TABLE public.group_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role group_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_memberships_group ON public.group_memberships(group_id);
CREATE INDEX idx_group_memberships_user ON public.group_memberships(user_id);
CREATE INDEX idx_group_memberships_role ON public.group_memberships(group_id, role);

-- ============================================================
-- ASSIGNMENTS
-- ============================================================

CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status assignment_status NOT NULL DEFAULT 'draft',

  -- Verse range for assignment
  start_book_id SMALLINT NOT NULL REFERENCES public.bible_books(id),
  start_chapter SMALLINT NOT NULL,
  start_verse SMALLINT NOT NULL,
  end_book_id SMALLINT NOT NULL REFERENCES public.bible_books(id),
  end_chapter SMALLINT NOT NULL,
  end_verse SMALLINT NOT NULL,

  -- Requirements
  observations_per_verse INTEGER DEFAULT 7,

  -- Dates
  due_date TIMESTAMPTZ,
  start_date TIMESTAMPTZ,

  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assignments_group ON public.assignments(group_id);
CREATE INDEX idx_assignments_status ON public.assignments(group_id, status);
CREATE INDEX idx_assignments_due_date ON public.assignments(due_date) WHERE due_date IS NOT NULL;

CREATE TRIGGER update_assignments_updated_at
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- OBSERVATIONS
-- ============================================================

CREATE TABLE public.observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User and context
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE SET NULL,
  group_id UUID REFERENCES public.study_groups(id) ON DELETE SET NULL,

  -- Verse reference
  book_id SMALLINT NOT NULL REFERENCES public.bible_books(id),
  chapter SMALLINT NOT NULL,
  start_verse SMALLINT NOT NULL,
  end_verse SMALLINT,

  -- Observation content
  category observation_category NOT NULL,
  title TEXT,
  content TEXT NOT NULL,

  -- Related Strong's references
  strongs_references TEXT[],

  -- Visibility
  is_private BOOLEAN NOT NULL DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_observations_user ON public.observations(user_id);
CREATE INDEX idx_observations_assignment ON public.observations(assignment_id) WHERE assignment_id IS NOT NULL;
CREATE INDEX idx_observations_group ON public.observations(group_id) WHERE group_id IS NOT NULL;
CREATE INDEX idx_observations_verse ON public.observations(book_id, chapter, start_verse);
CREATE INDEX idx_observations_category ON public.observations(category);
CREATE INDEX idx_observations_created ON public.observations(created_at DESC);

-- GIN index for Strong's references array
CREATE INDEX idx_observations_strongs ON public.observations USING GIN (strongs_references);

-- Full-text search on observation content
CREATE INDEX idx_observations_content_fts ON public.observations
  USING GIN (to_tsvector('english', COALESCE(title, '') || ' ' || content));

CREATE TRIGGER update_observations_updated_at
  BEFORE UPDATE ON public.observations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
