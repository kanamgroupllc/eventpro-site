-- Users can follow organizers to see their events in a "Following" feed.
CREATE TABLE IF NOT EXISTS organizer_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, organizer_id)
);

CREATE INDEX IF NOT EXISTS idx_organizer_follows_user_id ON organizer_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_organizer_follows_organizer_id ON organizer_follows(organizer_id);
COMMENT ON TABLE organizer_follows IS 'Users following organizers; used for Following list and optional feed.';
