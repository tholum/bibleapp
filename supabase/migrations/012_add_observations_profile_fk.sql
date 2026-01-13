-- Add foreign key from observations to profiles for PostgREST joins
ALTER TABLE public.observations
ADD CONSTRAINT observations_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
