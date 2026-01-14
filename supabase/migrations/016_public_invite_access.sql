-- ============================================================
-- Allow anonymous access to study groups via invite code
-- This enables the invite page to display group info before login
-- ============================================================

-- Allow anonymous users to read basic group info when they have an invite code
CREATE POLICY "Anyone can view groups by invite code"
  ON public.study_groups FOR SELECT
  TO anon
  USING (invite_code IS NOT NULL);

-- Allow anonymous users to read member count for invite pages
CREATE POLICY "Anyone can view group membership counts"
  ON public.group_memberships FOR SELECT
  TO anon
  USING (true);
