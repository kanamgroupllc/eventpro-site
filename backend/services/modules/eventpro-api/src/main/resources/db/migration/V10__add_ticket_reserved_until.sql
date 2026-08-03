-- Reservation expiry: release tickets back to pool after this time if not purchased
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS reserved_until TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_tickets_reserved_until ON tickets(reserved_until) WHERE ticket_status = 'RESERVED';

COMMENT ON COLUMN tickets.reserved_until IS 'When this reservation expires; after this time ticket is released back to available if still RESERVED';
