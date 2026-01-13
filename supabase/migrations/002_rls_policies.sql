-- ============================================================
-- Community Bible Study App - Row Level Security Policies
-- ============================================================

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Check if user is a member of a group
CREATE OR REPLACE FUNCTION public.is_group_member(group_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_id = group_uuid
    AND user_id = (SELECT auth.uid())
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user is admin or owner of a group
CREATE OR REPLACE FUNCTION public.is_group_admin(group_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_id = group_uuid
    AND user_id = (SELECT auth.uid())
    AND role IN ('admin', 'owner')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- PROFILES RLS
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- ============================================================
-- BIBLE REFERENCE TABLES RLS (Read-only)
-- ============================================================

ALTER TABLE public.bible_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bible books are readable by authenticated users"
  ON public.bible_books FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- STRONG'S CONCORDANCE RLS (Read-only)
-- ============================================================

ALTER TABLE public.strongs_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Strongs entries are readable by authenticated users"
  ON public.strongs_entries FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- STUDY GROUPS RLS
-- ============================================================

ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;

-- View public groups OR groups user is a member of
CREATE POLICY "Users can view public groups and their own groups"
  ON public.study_groups FOR SELECT
  TO authenticated
  USING (
    is_public = TRUE
    OR (SELECT public.is_group_member(id))
    OR created_by = (SELECT auth.uid())
  );

-- Any authenticated user can create a group
CREATE POLICY "Authenticated users can create groups"
  ON public.study_groups FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = created_by);

-- Only owner/admin can update group
CREATE POLICY "Group admins can update groups"
  ON public.study_groups FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_group_admin(id)))
  WITH CHECK ((SELECT public.is_group_admin(id)));

-- Only owner can delete group
CREATE POLICY "Group owner can delete group"
  ON public.study_groups FOR DELETE
  TO authenticated
  USING (created_by = (SELECT auth.uid()));

-- ============================================================
-- GROUP MEMBERSHIPS RLS
-- ============================================================

ALTER TABLE public.group_memberships ENABLE ROW LEVEL SECURITY;

-- Members can view other members in their groups
CREATE POLICY "Group members can view memberships"
  ON public.group_memberships FOR SELECT
  TO authenticated
  USING (
    group_id IN (
      SELECT group_id FROM public.group_memberships
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Users can join groups (insert their own membership)
CREATE POLICY "Users can join groups"
  ON public.group_memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
  );

-- Admins can update member roles (except owner)
CREATE POLICY "Admins can update member roles"
  ON public.group_memberships FOR UPDATE
  TO authenticated
  USING (
    (SELECT public.is_group_admin(group_id))
    AND role != 'owner'
  )
  WITH CHECK (
    (SELECT public.is_group_admin(group_id))
    AND role != 'owner'
  );

-- Users can leave groups or admins can remove members
CREATE POLICY "Users can leave or admins can remove members"
  ON public.group_memberships FOR DELETE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (
      (SELECT public.is_group_admin(group_id))
      AND role != 'owner'
    )
  );

-- ============================================================
-- ASSIGNMENTS RLS
-- ============================================================

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Group members can view assignments
CREATE POLICY "Group members can view assignments"
  ON public.assignments FOR SELECT
  TO authenticated
  USING ((SELECT public.is_group_member(group_id)));

-- Group admins can create assignments
CREATE POLICY "Group admins can create assignments"
  ON public.assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.is_group_admin(group_id))
    AND created_by = (SELECT auth.uid())
  );

-- Group admins can update assignments
CREATE POLICY "Group admins can update assignments"
  ON public.assignments FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_group_admin(group_id)))
  WITH CHECK ((SELECT public.is_group_admin(group_id)));

-- Group admins can delete assignments
CREATE POLICY "Group admins can delete assignments"
  ON public.assignments FOR DELETE
  TO authenticated
  USING ((SELECT public.is_group_admin(group_id)));

-- ============================================================
-- OBSERVATIONS RLS
-- ============================================================

ALTER TABLE public.observations ENABLE ROW LEVEL SECURITY;

-- Users can view their own observations and non-private group observations
CREATE POLICY "Users can view accessible observations"
  ON public.observations FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (
      is_private = FALSE
      AND group_id IS NOT NULL
      AND (SELECT public.is_group_member(group_id))
    )
    OR (
      is_private = FALSE
      AND assignment_id IN (
        SELECT a.id FROM public.assignments a
        WHERE (SELECT public.is_group_member(a.group_id))
      )
    )
  );

-- Users can create their own observations
CREATE POLICY "Users can create observations"
  ON public.observations FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (
      group_id IS NULL
      OR (SELECT public.is_group_member(group_id))
    )
    AND (
      assignment_id IS NULL
      OR assignment_id IN (
        SELECT a.id FROM public.assignments a
        WHERE (SELECT public.is_group_member(a.group_id))
      )
    )
  );

-- Users can update their own observations
CREATE POLICY "Users can update their own observations"
  ON public.observations FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Users can delete their own observations
CREATE POLICY "Users can delete their own observations"
  ON public.observations FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));
