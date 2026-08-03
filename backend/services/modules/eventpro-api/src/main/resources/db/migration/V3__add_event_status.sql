-- Flyway Migration: V3__add_event_status.sql
-- Description: Adds status field to events table for draft/publish workflow
-- Database: PostgreSQL 15+

-- Create event_status enum type
CREATE TYPE event_status AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED');

-- Add status column to events table with default value of DRAFT
ALTER TABLE events
    ADD COLUMN status event_status NOT NULL DEFAULT 'DRAFT';

-- Create index on status column for efficient filtering
CREATE INDEX idx_event_status ON events(status);

-- Add composite index for common query pattern (status + start_time)
CREATE INDEX idx_event_status_start_time ON events(status, start_time);