-- Secure check_table_exists function by setting search_path
-- This prevents search_path hijacking vulnerabilities in SECURITY DEFINER functions

CREATE OR REPLACE FUNCTION public.check_table_exists(table_names text[])
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  current_table_name text;
  table_info json;
  tables_info json[] := '{}';
BEGIN
  FOREACH current_table_name IN ARRAY table_names LOOP
    SELECT json_build_object(
      'table_name', current_table_name,
      'exists',
        EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND information_schema.tables.table_name = current_table_name
        ),
      'schema', 'public'
    )
    INTO table_info;

    tables_info := tables_info || table_info;
  END LOOP;

  SELECT json_agg(t) INTO result FROM unnest(tables_info) AS t;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_table_exists(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_table_exists(text[]) TO anon;
