-- HomeMatch V2 Database Schema Migration
-- Step 2.2: Complete database setup with PostGIS support

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";