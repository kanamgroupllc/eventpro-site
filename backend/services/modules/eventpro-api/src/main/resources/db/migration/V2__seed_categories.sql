-- Flyway Migration: V2__seed_categories.sql
-- Description: Seeds predefined event categories
-- Database: PostgreSQL 15+
-- Note: This migration is idempotent - safe to run multiple times

-- Insert predefined categories
-- Using ON CONFLICT to ensure idempotency for first-time and subsequent runs
INSERT INTO categories (id, name, description, created_at, updated_at) VALUES
    (gen_random_uuid(), 'Music', 'Concerts, festivals, and live music events', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Sports', 'Sports games, tournaments, and athletic events', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Arts & Crafts', 'Art exhibitions, craft workshops, and creative events', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Fashion & Beauty', 'Fashion shows, beauty events, and style workshops', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Health & Fitness', 'Fitness classes, wellness workshops, and health events', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'School Program', 'Educational events, school programs, and academic activities', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

