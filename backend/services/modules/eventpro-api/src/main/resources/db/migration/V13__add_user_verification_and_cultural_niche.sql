-- Organizer verification (gate for Early/Instant Payouts per design doc).
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN users.is_verified IS 'True when tax/ID provided and risk check passed; gates payouts.';

-- Cultural niche for Hyper-Local & Cultural Discovery (US diaspora).
ALTER TABLE users
ADD COLUMN IF NOT EXISTS cultural_niche VARCHAR(255);

COMMENT ON COLUMN users.cultural_niche IS 'Organizer focus e.g. West African Cultural Events; feeds search taxonomy.';

CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified);
