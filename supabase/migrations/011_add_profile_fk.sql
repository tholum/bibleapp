-- Add foreign key from group_memberships to profiles for PostgREST joins
ALTER TABLE public.group_memberships
ADD CONSTRAINT group_memberships_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
