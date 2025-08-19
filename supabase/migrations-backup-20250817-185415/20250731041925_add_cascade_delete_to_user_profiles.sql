-- Add CASCADE delete to user_profiles foreign key
-- This ensures test users can be completely cleaned up

-- Drop the existing foreign key constraint
ALTER TABLE public.user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- Re-add the foreign key with CASCADE delete
ALTER TABLE public.user_profiles
ADD CONSTRAINT user_profiles_id_fkey 
FOREIGN KEY (id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Also add CASCADE to other user-related tables that actually exist
-- User property interactions (the actual table name)
ALTER TABLE public.user_property_interactions
DROP CONSTRAINT IF EXISTS user_property_interactions_user_id_fkey;

ALTER TABLE public.user_property_interactions
ADD CONSTRAINT user_property_interactions_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Saved searches
ALTER TABLE public.saved_searches
DROP CONSTRAINT IF EXISTS saved_searches_user_id_fkey;

ALTER TABLE public.saved_searches
ADD CONSTRAINT saved_searches_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Add a comment to document this change
COMMENT ON CONSTRAINT user_profiles_id_fkey ON public.user_profiles IS 'Foreign key to auth.users with CASCADE delete for proper test cleanup';