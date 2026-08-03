-- Team management: invite members to manage organizer's events (Pro/Enterprise)
CREATE TABLE IF NOT EXISTS organizer_team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'EDITOR',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organizer_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_organizer_team_members_organizer_id ON organizer_team_members(organizer_id);
CREATE INDEX IF NOT EXISTS idx_organizer_team_members_user_id ON organizer_team_members(user_id);
COMMENT ON TABLE organizer_team_members IS 'Team members who can manage an organizer''s events; roles: ADMIN, EDITOR, VIEWER';
