-- Stripe Connect Express account ID for organizer payouts. Set after onboarding via Connect.
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_connect_account_id VARCHAR(255);
COMMENT ON COLUMN users.stripe_connect_account_id IS 'Stripe Connect Express account ID; payouts are sent to this account.';
