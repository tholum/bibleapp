-- ============================================================
-- Auto-add group creator as owner
-- ============================================================

-- Function to automatically add creator as owner when group is created
CREATE OR REPLACE FUNCTION public.handle_new_group()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.group_memberships (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function after group insert
DROP TRIGGER IF EXISTS on_group_created ON public.study_groups;
CREATE TRIGGER on_group_created
  AFTER INSERT ON public.study_groups
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_group();
