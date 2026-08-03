-- Flyway Migration: V36__add_missing_event_categories.sql
-- Description: Add event form categories missing from earlier seeds (Conference, Comedy, Theater)
-- Idempotent: ON CONFLICT (name) DO NOTHING

INSERT INTO categories (id, name, description, created_at, updated_at) VALUES
    (gen_random_uuid(), 'Conference', 'Conferences, summits, and professional gatherings', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Comedy', 'Comedy shows and stand-up events', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Theater', 'Theater performances and stage shows', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;
