-- Create users table for tests that expect it
-- This table mirrors auth.users but allows test data insertion
-- Some tests (particularly performance tests) expect a 'users' table

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Don't add foreign key constraint from user_profiles to users table
-- This would create a circular dependency with auth.users
-- Instead, keep them loosely coupled for flexibility

-- Create a trigger to automatically sync auth.users to users table
CREATE OR REPLACE FUNCTION sync_users_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS sync_users_from_auth_trigger ON auth.users;

CREATE TRIGGER sync_users_from_auth_trigger
AFTER INSERT OR UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION sync_users_from_auth();

-- Sync existing auth.users to users table
INSERT INTO users (id, email)
SELECT id, email
FROM auth.users
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    updated_at = NOW();

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own record
CREATE POLICY "Users can view their own record" ON users
  FOR SELECT USING (auth.uid() = id);

-- Allow service role full access
CREATE POLICY "Service role has full access to users" ON users
  FOR ALL USING (
    auth.jwt()->>'role' = 'service_role'
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Add comment explaining this table's purpose
COMMENT ON TABLE users IS 'Mirror of auth.users for test compatibility and foreign key references';