-- W-9 / 1099-K compliance: IRS requires 1099-K when gross payments exceed $600.
-- Flag when organizer has submitted W-9 (TIN) so we can issue forms and allow payouts.
ALTER TABLE users
ADD COLUMN IF NOT EXISTS w9_submitted BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN users.w9_submitted IS 'True when organizer submitted W-9 (TIN); required before payouts at $600+ threshold';

CREATE INDEX IF NOT EXISTS idx_users_w9_submitted ON users(w9_submitted);
