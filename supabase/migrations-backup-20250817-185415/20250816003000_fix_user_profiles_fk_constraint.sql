-- Fix user_profiles foreign key constraint to point to users table instead of auth.users
-- This aligns with the test users table created in 20250815152507_create_users_table_for_tests.sql

-- Drop the existing foreign key constraint that points to auth.users
ALTER TABLE public.user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- Add the correct foreign key constraint that points to the users table
ALTER TABLE public.user_profiles
ADD CONSTRAINT user_profiles_id_fkey 
FOREIGN KEY (id) 
REFERENCES users(id) 
ON DELETE CASCADE;

-- Also update user_property_interactions to reference users table
ALTER TABLE public.user_property_interactions
DROP CONSTRAINT IF EXISTS user_property_interactions_user_id_fkey;

ALTER TABLE public.user_property_interactions
ADD CONSTRAINT user_property_interactions_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES users(id)
ON DELETE CASCADE;

-- Update saved_searches to reference users table
ALTER TABLE public.saved_searches
DROP CONSTRAINT IF EXISTS saved_searches_user_id_fkey;

ALTER TABLE public.saved_searches
ADD CONSTRAINT saved_searches_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES users(id)
ON DELETE CASCADE;

-- Add comments to document the change
COMMENT ON CONSTRAINT user_profiles_id_fkey ON public.user_profiles 
IS 'Foreign key to users table (test-compatible) with CASCADE delete for proper test cleanup';

COMMENT ON CONSTRAINT user_property_interactions_user_id_fkey ON public.user_property_interactions
IS 'Foreign key to users table (test-compatible) with CASCADE delete for proper test cleanup';

COMMENT ON CONSTRAINT saved_searches_user_id_fkey ON public.saved_searches
IS 'Foreign key to users table (test-compatible) with CASCADE delete for proper test cleanup';