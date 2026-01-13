-- Add fields for word-level observations and Bible version tracking
ALTER TABLE public.observations
ADD COLUMN IF NOT EXISTS selected_word TEXT,
ADD COLUMN IF NOT EXISTS bible_version_id TEXT,
ADD COLUMN IF NOT EXISTS bible_version_name TEXT;

-- Add comment explaining the fields
COMMENT ON COLUMN public.observations.selected_word IS 'The specific word selected when making a word-level observation';
COMMENT ON COLUMN public.observations.bible_version_id IS 'API.Bible version ID used when the observation was made';
COMMENT ON COLUMN public.observations.bible_version_name IS 'Human-readable Bible version name (e.g., BSB, KJV)';
