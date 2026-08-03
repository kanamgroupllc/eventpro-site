-- Electric Wallet: per-user store credit balance + append-only ledger
CREATE TABLE IF NOT EXISTS wallet_accounts (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);
COMMENT ON TABLE wallet_accounts IS 'Buyer Electric Wallet balance (store credit from refunds, usable at checkout)';

CREATE TABLE IF NOT EXISTS wallet_ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    entry_type VARCHAR(10) NOT NULL CHECK (entry_type IN ('CREDIT', 'DEBIT')),
    reference_type VARCHAR(30) NOT NULL,
    reference_id UUID,
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    description VARCHAR(500),
    balance_after DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);
COMMENT ON TABLE wallet_ledger_entries IS 'Append-only Electric Wallet ledger (credits on refund, debits at checkout)';
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user_created ON wallet_ledger_entries(user_id, created_at DESC);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_intent_id VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS wallet_amount DECIMAL(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30);
CREATE INDEX IF NOT EXISTS idx_orders_payment_intent_id ON orders(payment_intent_id) WHERE payment_intent_id IS NOT NULL;
