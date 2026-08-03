-- Check-in tracking for door validation (QR scan)
ALTER TABLE tickets
    ADD COLUMN IF NOT EXISTS checked_in BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP;

COMMENT ON COLUMN tickets.checked_in IS 'True when attendee was checked in at the door';
COMMENT ON COLUMN tickets.checked_in_at IS 'When the ticket was checked in';
