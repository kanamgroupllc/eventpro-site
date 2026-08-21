ALTER TABLE checkout_outbox_events DROP CONSTRAINT ck_checkout_outbox_status;
ALTER TABLE checkout_outbox_events
    ADD COLUMN lease_until TIMESTAMP,
    ADD CONSTRAINT ck_checkout_outbox_status
        CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'));

CREATE INDEX idx_checkout_outbox_lease
    ON checkout_outbox_events(status, lease_until)
    WHERE status = 'PROCESSING';
