-- Link user to Stripe Customer for subscription billing (created when user starts checkout).
ALTER TABLE users
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

COMMENT ON COLUMN users.stripe_customer_id IS 'Stripe Customer ID for subscription billing; set when user creates subscription checkout';
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
