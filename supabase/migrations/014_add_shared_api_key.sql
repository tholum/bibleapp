-- Add shared API key fields to study_groups
-- Allows a group member to share their API.Bible key with the entire group

ALTER TABLE public.study_groups
ADD COLUMN IF NOT EXISTS shared_api_bible_key TEXT,
ADD COLUMN IF NOT EXISTS shared_api_bible_key_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add comment explaining the fields
COMMENT ON COLUMN public.study_groups.shared_api_bible_key IS 'API.Bible key shared by a group member for all members to use';
COMMENT ON COLUMN public.study_groups.shared_api_bible_key_by IS 'User ID of the member who shared their API key';
