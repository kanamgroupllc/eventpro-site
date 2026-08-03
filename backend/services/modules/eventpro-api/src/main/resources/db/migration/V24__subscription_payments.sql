-- Subscription/plan payments (Pro, Enterprise): record when organizers pay for their plan (separate from ticket-sale fees).
-- Used for 1099-K "subscription fees paid" line (for organizer records) and platform accounting.
CREATE TABLE IF NOT EXISTS subscription_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    paid_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    tier VARCHAR(20) NOT NULL,
    period VARCHAR(20) NOT NULL DEFAULT 'MONTHLY'
);
COMMENT ON TABLE subscription_payments IS 'Pro/Enterprise plan payments; record when organizer pays monthly/yearly subscription';
CREATE INDEX IF NOT EXISTS idx_subscription_payments_user_id ON subscription_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_paid_at ON subscription_payments(paid_at);
