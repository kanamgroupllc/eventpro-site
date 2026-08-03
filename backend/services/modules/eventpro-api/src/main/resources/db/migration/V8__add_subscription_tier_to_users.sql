-- Subscription/plan tier per pricing page: Basic (free), Pro, Enterprise.
-- Used to gate features (add-ons, early payouts, custom domain, API, etc.).
ALTER TABLE users
ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) NOT NULL DEFAULT 'BASIC';

COMMENT ON COLUMN users.subscription_tier IS 'BASIC | PRO | ENTERPRISE; gates features per pricing page';

CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
