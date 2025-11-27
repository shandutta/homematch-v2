-- Add created_by and user_count columns to households table
-- and add INSERT policy for creating households

-- Add the created_by column (references auth.users)
ALTER TABLE households
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Add the user_count column (defaults to 1 for new households)
ALTER TABLE households
  ADD COLUMN IF NOT EXISTS user_count INTEGER DEFAULT 1;

-- Make name column nullable since we're creating households without names
ALTER TABLE households
  ALTER COLUMN name DROP NOT NULL;

-- Add INSERT policy for households table
-- Allows authenticated users to create households where they are the creator
CREATE POLICY "Users can create households" ON households
  FOR INSERT WITH CHECK (auth.uid() = created_by);
