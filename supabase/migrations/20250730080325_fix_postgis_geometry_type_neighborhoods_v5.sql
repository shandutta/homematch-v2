-- SAFE PostGIS geometry migration for neighborhoods bounds column
-- Using ST_MakePolygon with proper conversion

DO $$
DECLARE
    has_postgis_extension BOOLEAN;
    has_polygon_data BOOLEAN;
    column_type TEXT;
BEGIN
    -- Check if PostGIS is installed
    SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'postgis'
    ) INTO has_postgis_extension;
    
    IF NOT has_postgis_extension THEN
        RAISE EXCEPTION 'PostGIS extension is not installed. Please install it first.';
    END IF;
    
    -- Check current column type
    SELECT data_type INTO column_type
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'neighborhoods' 
      AND column_name = 'bounds';
    
    -- If already using geometry type, skip migration
    IF column_type = 'USER-DEFINED' THEN
        -- Check if it's already the correct geometry type
        IF EXISTS (
            SELECT 1 
            FROM geometry_columns 
            WHERE f_table_schema = 'public' 
              AND f_table_name = 'neighborhoods' 
              AND f_geometry_column = 'bounds'
              AND type = 'POLYGON'
              AND srid = 4326
        ) THEN
            RAISE NOTICE 'Column already uses correct PostGIS geometry type. Skipping migration.';
            RETURN;
        END IF;
    END IF;
    
    -- Check if we have data to preserve
    SELECT EXISTS (
        SELECT 1 FROM neighborhoods WHERE bounds IS NOT NULL
    ) INTO has_polygon_data;
    
    IF has_polygon_data THEN
        RAISE NOTICE 'Found existing polygon data. Creating backup and converting...';
        
        -- Create backup column
        ALTER TABLE neighborhoods 
        ADD COLUMN IF NOT EXISTS bounds_backup polygon;
        
        -- Copy existing data to backup
        UPDATE neighborhoods 
        SET bounds_backup = bounds
        WHERE bounds IS NOT NULL;
        
        -- Add new PostGIS column
        ALTER TABLE neighborhoods 
        ADD COLUMN IF NOT EXISTS bounds_new GEOMETRY(POLYGON, 4326);
        
        -- Convert polygon to PostGIS using ST_MakePolygon
        -- First convert to path (linestring), then to polygon
        UPDATE neighborhoods 
        SET bounds_new = ST_SetSRID(
            ST_MakePolygon(
                bounds::path::geometry
            ), 
            4326
        )
        WHERE bounds IS NOT NULL;
        
        -- Drop old column and rename new one
        ALTER TABLE neighborhoods DROP COLUMN bounds;
        ALTER TABLE neighborhoods RENAME COLUMN bounds_new TO bounds;
        
        RAISE NOTICE 'Data conversion complete. Backup stored in bounds_backup column.';
    ELSE
        RAISE NOTICE 'No existing polygon data found. Safe to recreate column.';
        
        -- Simply drop and recreate if no data
        ALTER TABLE neighborhoods DROP COLUMN IF EXISTS bounds;
        ALTER TABLE neighborhoods ADD COLUMN bounds GEOMETRY(POLYGON, 4326);
    END IF;
    
    -- Create spatial index
    CREATE INDEX IF NOT EXISTS idx_neighborhoods_bounds 
    ON neighborhoods USING GIST(bounds);
    
    -- Add documentation
    COMMENT ON COLUMN neighborhoods.bounds IS 
    'PostGIS polygon geometry representing neighborhood boundaries in WGS84 (SRID 4326)';
    
END $$;