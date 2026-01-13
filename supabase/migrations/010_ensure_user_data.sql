-- Ensure the user has a profile
INSERT INTO public.profiles (id, email, display_name)
VALUES ('acb5ace4-1d91-4859-9570-f816c694462b', NULL, 'User')
ON CONFLICT (id) DO NOTHING;

-- Create a test group if none exist
INSERT INTO public.study_groups (id, name, description, created_by, invite_code)
SELECT
  gen_random_uuid(),
  'Bible Study Group',
  'A group for studying the Bible together',
  'acb5ace4-1d91-4859-9570-f816c694462b',
  upper(substr(md5(random()::text), 1, 6))
WHERE NOT EXISTS (SELECT 1 FROM public.study_groups LIMIT 1);

-- Ensure user is owner of all groups they created
INSERT INTO public.group_memberships (group_id, user_id, role)
SELECT sg.id, sg.created_by, 'owner'
FROM public.study_groups sg
WHERE sg.created_by = 'acb5ace4-1d91-4859-9570-f816c694462b'
AND NOT EXISTS (
  SELECT 1 FROM public.group_memberships gm
  WHERE gm.group_id = sg.id AND gm.user_id = sg.created_by
);
