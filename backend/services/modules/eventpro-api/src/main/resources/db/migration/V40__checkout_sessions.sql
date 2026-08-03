CREATE TABLE checkout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    idempotency_key VARCHAR(100) NOT NULL UNIQUE,
    resume_token_hash VARCHAR(64) NOT NULL UNIQUE,
    status VARCHAR(30) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    payment_intent_id VARCHAR(255) UNIQUE,
    order_id UUID UNIQUE REFERENCES orders(id) ON DELETE SET NULL,
    guest_email VARCHAR(255), guest_first_name VARCHAR(100), guest_last_name VARCHAR(100),
    buyer_state VARCHAR(10), buyer_country VARCHAR(2),
    subtotal NUMERIC(10,2) NOT NULL,
    addon_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    donation_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(10,2) NOT NULL,
    wallet_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'usd', adjustments_json TEXT, refund_id VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_checkout_session_status CHECK (status IN ('PENDING','COMPLETED','CANCELLED','EXPIRED','PAYMENT_FAILED','REFUND_PENDING','REFUNDED')),
    CONSTRAINT ck_checkout_session_amounts CHECK (subtotal >= 0 AND addon_amount >= 0 AND donation_amount >= 0 AND tax_amount >= 0 AND total_amount >= 0 AND wallet_amount >= 0 AND wallet_amount <= total_amount)
);
CREATE INDEX idx_checkout_session_user_status ON checkout_sessions(user_id, status);
CREATE UNIQUE INDEX uk_checkout_session_pending_user ON checkout_sessions(user_id)
    WHERE user_id IS NOT NULL AND status = 'PENDING';
CREATE INDEX idx_checkout_session_expiry ON checkout_sessions(status, expires_at);

CREATE TABLE checkout_session_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checkout_session_id UUID NOT NULL REFERENCES checkout_sessions(id) ON DELETE CASCADE,
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE RESTRICT,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
    ticket_type VARCHAR(30) NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_checkout_session_ticket UNIQUE(checkout_session_id, ticket_id)
);
CREATE INDEX idx_checkout_session_ticket_session ON checkout_session_tickets(checkout_session_id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_order_payment_intent ON orders(payment_intent_id) WHERE payment_intent_id IS NOT NULL;
