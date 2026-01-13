-- Fix the recursive RLS policy on group_memberships
-- The old policy caused infinite recursion by querying group_memberships to check group_memberships

-- Drop the problematic policy
DROP POLICY IF EXISTS "Group members can view memberships" ON public.group_memberships;

-- Create a helper function that bypasses RLS to check membership
CREATE OR REPLACE FUNCTION public.get_user_group_ids(check_user_id UUID)
RETURNS SETOF UUID AS $$
  SELECT group_id FROM public.group_memberships WHERE user_id = check_user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Create a non-recursive policy using the helper function
CREATE POLICY "Users can view memberships in their groups"
  ON public.group_memberships FOR SELECT
  TO authenticated
  USING (
    -- Users can see memberships in groups they belong to
    group_id IN (SELECT public.get_user_group_ids((SELECT auth.uid())))
  );
