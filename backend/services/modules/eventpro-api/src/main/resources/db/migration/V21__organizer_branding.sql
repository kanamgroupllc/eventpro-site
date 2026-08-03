-- White-label / custom branding (Pro/Enterprise): per-organizer logo, color, hide platform name
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS branding_logo_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS branding_primary_color VARCHAR(20),
    ADD COLUMN IF NOT EXISTS branding_hide_platform BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN users.branding_logo_url IS 'Organizer custom logo URL for event pages and emails';
COMMENT ON COLUMN users.branding_primary_color IS 'Hex color e.g. #1a1a2e for buttons/accents';
COMMENT ON COLUMN users.branding_hide_platform IS 'When true, hide Access Plus / platform branding on event pages';
