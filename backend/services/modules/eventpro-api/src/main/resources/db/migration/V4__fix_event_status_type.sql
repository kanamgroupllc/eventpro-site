-- Flyway Migration: V4__fix_event_status_type.sql
-- Description: Convert event status from PostgreSQL ENUM to VARCHAR for JPA compatibility
-- Database: PostgreSQL 15+

-- Drop the enum-based column and recreate as VARCHAR
ALTER TABLE events DROP COLUMN IF EXISTS status;

-- Add status as VARCHAR with constraint to match enum values
ALTER TABLE events
    ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'DRAFT';

-- Add check constraint to ensure only valid values
ALTER TABLE events
    ADD CONSTRAINT chk_event_status
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'));

-- Recreate indexes
CREATE INDEX idx_event_status ON events(status);
CREATE INDEX idx_event_status_start_time ON events(status, start_time);

-- We can optionally drop the enum type if not used elsewhere
-- DROP TYPE IF EXISTS event_status;