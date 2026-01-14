-- Add custom_bible_passages table for storing user-pasted Bible text
-- Allows groups to share custom versions/translations

CREATE TABLE IF NOT EXISTS public.custom_bible_passages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  version_name TEXT NOT NULL,  -- e.g., "ESV", "NIV", "Custom"
  book_abbreviation TEXT NOT NULL,  -- e.g., "Phl", "Gen", "Mat"
  book_name TEXT,  -- Full name if known, e.g., "Philippians"
  start_chapter INTEGER NOT NULL,
  start_verse INTEGER NOT NULL,
  end_chapter INTEGER NOT NULL,
  end_verse INTEGER NOT NULL,
  content TEXT NOT NULL,  -- The parsed HTML content with verse markers
  raw_text TEXT NOT NULL,  -- The original pasted text
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_custom_bible_passages_group ON public.custom_bible_passages(group_id);
CREATE INDEX IF NOT EXISTS idx_custom_bible_passages_lookup ON public.custom_bible_passages(group_id, book_abbreviation, start_chapter, end_chapter);

-- Add RLS policies
ALTER TABLE public.custom_bible_passages ENABLE ROW LEVEL SECURITY;

-- Group members can view custom passages for their groups
CREATE POLICY "Group members can view custom passages"
  ON public.custom_bible_passages
  FOR SELECT
  USING (is_group_member(group_id));

-- Group members can insert custom passages
CREATE POLICY "Group members can insert custom passages"
  ON public.custom_bible_passages
  FOR INSERT
  WITH CHECK (is_group_member(group_id) AND auth.uid() = created_by);

-- Only the creator or group admins can update
CREATE POLICY "Creator or admin can update custom passages"
  ON public.custom_bible_passages
  FOR UPDATE
  USING (
    created_by = auth.uid() OR is_group_admin(group_id)
  );

-- Only the creator or group admins can delete
CREATE POLICY "Creator or admin can delete custom passages"
  ON public.custom_bible_passages
  FOR DELETE
  USING (
    created_by = auth.uid() OR is_group_admin(group_id)
  );

-- Add comment
COMMENT ON TABLE public.custom_bible_passages IS 'Stores custom Bible passages pasted by group members for sharing within the group';
