-- Create check_table_exists function for integration tests
-- This function checks if specified tables exist in the public schema

CREATE OR REPLACE FUNCTION public.check_table_exists(table_names text[])
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  current_table_name text;
  table_info json;
  tables_info json[] := '{}';
BEGIN
  -- Loop through each table name
  FOREACH current_table_name IN ARRAY table_names
  LOOP
    -- Check if table exists in public schema
    SELECT json_build_object(
      'table_name', current_table_name,
      'exists', CASE WHEN EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND information_schema.tables.table_name = current_table_name
      ) THEN true ELSE false END,
      'schema', 'public'
    ) INTO table_info;
    
    -- Add to results array
    tables_info := tables_info || table_info;
  END LOOP;
  
  -- Return as JSON array
  SELECT json_agg(t) INTO result FROM unnest(tables_info) AS t;
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_table_exists(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_table_exists(text[]) TO anon;