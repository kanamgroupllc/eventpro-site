-- Flyway Migration: V6__add_event_categories_enum_tags.sql
-- Description: Add additional category tags to align with frontend (Technology, Arts, etc.) and cultural taxonomy
-- Database: PostgreSQL 15+
-- Idempotent: ON CONFLICT (name) DO NOTHING

INSERT INTO categories (id, name, description, created_at, updated_at) VALUES
    (gen_random_uuid(), 'Technology', 'Tech conferences, hackathons, and innovation events', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Business', 'Networking, conferences, and professional development', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Arts', 'Art exhibitions, performances, and creative events', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Food & Drink', 'Food festivals, tastings, and culinary events', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Health & Wellness', 'Wellness retreats, yoga, and health workshops', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Education', 'Workshops, seminars, and learning events', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Entertainment', 'Shows, comedy, and entertainment events', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Other', 'Other events and miscellaneous', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Gala & Fundraiser', 'Galas, fundraisers, and charity events', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'National Day Celebration', 'National and independence day events', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Diaspora Film Screening', 'Film screenings and diaspora cinema', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Community Gathering', 'Community meetups and gatherings', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Religious & Spiritual', 'Religious and spiritual events', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Cultural Festival', 'Cultural festivals and heritage events', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Afrobeat Concert', 'Afrobeat and African music concerts', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Caribbean Night', 'Caribbean music and culture nights', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Latin Fiesta', 'Latin music and fiesta events', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;
