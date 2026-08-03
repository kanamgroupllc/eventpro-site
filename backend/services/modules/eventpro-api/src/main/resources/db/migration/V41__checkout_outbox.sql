CREATE TABLE checkout_outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    aggregate_id VARCHAR(100) NOT NULL,
    payload TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    attempts INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_error VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_checkout_outbox_status CHECK (status IN ('PENDING','COMPLETED'))
);
CREATE INDEX idx_checkout_outbox_due ON checkout_outbox_events(status, next_attempt_at);
CREATE UNIQUE INDEX uk_checkout_outbox_event ON checkout_outbox_events(event_type, aggregate_id);
