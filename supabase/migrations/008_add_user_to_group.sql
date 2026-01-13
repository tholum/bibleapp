-- Add all users to all groups they're not already members of (as owner)
INSERT INTO public.group_memberships (group_id, user_id, role)
SELECT sg.id, p.id, 'owner'
FROM public.study_groups sg
CROSS JOIN public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.group_memberships gm
  WHERE gm.group_id = sg.id AND gm.user_id = p.id
);
