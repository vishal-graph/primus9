-- ===========================================
-- TatvaOps Vision - Initial Database Setup
-- ===========================================
-- Run this script after RDS instance is created
-- to set up extensions and initial configurations.
--
-- Usage:
--   psql -h <rds-endpoint> -U tatvaops_admin -d tatvaops_vision -f setup-rds.sql
--
-- ===========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search

-- Create schema for better organization (optional)
-- CREATE SCHEMA IF NOT EXISTS tatvaops;

-- Performance: Enable pg_stat_statements for query analysis
-- Note: This requires the parameter group to have pg_stat_statements enabled
-- CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ===========================================
-- Custom Types (if not using Prisma enums)
-- ===========================================

-- Note: Prisma handles these, but keeping for reference
-- CREATE TYPE project_status AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED');
-- CREATE TYPE room_status AS ENUM ('PENDING', 'CONFIRMED', 'LOCKED');
-- CREATE TYPE ai_job_status AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');
-- CREATE TYPE ai_job_type AS ENUM ('FLOORPLAN_ANALYSIS', 'MOODBOARD', 'ELEVATION', 'INTERIOR', 'COMPONENT_UPDATE');

-- ===========================================
-- Indexes for common queries
-- ===========================================

-- Note: Prisma migrations will create these, but documenting expected indexes

-- Users
-- CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
-- CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Projects
-- CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
-- CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
-- CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- Rooms
-- CREATE INDEX IF NOT EXISTS idx_rooms_project_id ON rooms(project_id);

-- AI Jobs
-- CREATE INDEX IF NOT EXISTS idx_ai_jobs_user_id ON ai_jobs(user_id);
-- CREATE INDEX IF NOT EXISTS idx_ai_jobs_project_id ON ai_jobs(project_id);
-- CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON ai_jobs(status);
-- CREATE INDEX IF NOT EXISTS idx_ai_jobs_type_status ON ai_jobs(type, status);

-- ===========================================
-- Database configuration
-- ===========================================

-- Set default timezone
SET timezone = 'UTC';

-- Configure search path
-- SET search_path TO tatvaops, public;

-- ===========================================
-- Verification queries
-- ===========================================

-- Check installed extensions
SELECT extname, extversion FROM pg_extension;

-- Check current database settings
SELECT name, setting, unit, context 
FROM pg_settings 
WHERE name IN (
    'shared_buffers', 
    'effective_cache_size', 
    'work_mem', 
    'maintenance_work_mem',
    'max_connections',
    'timezone'
);

-- Display success message
DO $$
BEGIN
    RAISE NOTICE '✅ TatvaOps Vision database setup complete!';
END $$;

