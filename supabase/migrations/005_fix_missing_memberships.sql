-- Fix any groups where creator is not a member
INSERT INTO public.group_memberships (group_id, user_id, role)
SELECT sg.id, sg.created_by, 'owner'
FROM public.study_groups sg
WHERE NOT EXISTS (
  SELECT 1 FROM public.group_memberships gm
  WHERE gm.group_id = sg.id AND gm.user_id = sg.created_by
);
