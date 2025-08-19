-- SAFE PostGIS geometry migration for properties coordinates column
-- This version preserves existing data by converting it

DO $$
DECLARE
    has_postgis_extension BOOLEAN;
    has_point_data BOOLEAN;
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
      AND table_name = 'properties' 
      AND column_name = 'coordinates';
    
    -- If already using geometry type, skip migration
    IF column_type = 'USER-DEFINED' THEN
        -- Check if it's already the correct geometry type
        IF EXISTS (
            SELECT 1 
            FROM geometry_columns 
            WHERE f_table_schema = 'public' 
              AND f_table_name = 'properties' 
              AND f_geometry_column = 'coordinates'
              AND type = 'POINT'
              AND srid = 4326
        ) THEN
            RAISE NOTICE 'Column already uses correct PostGIS geometry type. Skipping migration.';
            RETURN;
        END IF;
    END IF;
    
    -- Check if we have data to preserve
    SELECT EXISTS (
        SELECT 1 FROM properties WHERE coordinates IS NOT NULL
    ) INTO has_point_data;
    
    IF has_point_data THEN
        RAISE NOTICE 'Found existing point data. Creating backup and converting...';
        
        -- Create backup column
        ALTER TABLE properties 
        ADD COLUMN IF NOT EXISTS coordinates_backup point;
        
        -- Copy existing data to backup
        UPDATE properties 
        SET coordinates_backup = coordinates
        WHERE coordinates IS NOT NULL;
        
        -- Add new PostGIS column
        ALTER TABLE properties 
        ADD COLUMN IF NOT EXISTS coordinates_new GEOMETRY(POINT, 4326);
        
        -- Convert point data to PostGIS
        -- PostgreSQL point format: (x,y) = (longitude,latitude)
        UPDATE properties 
        SET coordinates_new = ST_SetSRID(
            ST_MakePoint(
                (coordinates[0])::double precision,  -- longitude
                (coordinates[1])::double precision   -- latitude
            ), 
            4326
        )
        WHERE coordinates IS NOT NULL;
        
        -- Drop old column and rename new one
        ALTER TABLE properties DROP COLUMN coordinates;
        ALTER TABLE properties RENAME COLUMN coordinates_new TO coordinates;
        
        RAISE NOTICE 'Data conversion complete. Backup stored in coordinates_backup column.';
    ELSE
        RAISE NOTICE 'No existing point data found. Safe to recreate column.';
        
        -- Simply drop and recreate if no data
        ALTER TABLE properties DROP COLUMN IF EXISTS coordinates;
        ALTER TABLE properties ADD COLUMN coordinates GEOMETRY(POINT, 4326);
    END IF;
    
    -- Create spatial index
    CREATE INDEX IF NOT EXISTS idx_properties_coordinates 
    ON properties USING GIST(coordinates);
    
    -- Add documentation
    COMMENT ON COLUMN properties.coordinates IS 
    'PostGIS point geometry representing property location in WGS84 (SRID 4326)';
    
END $$;