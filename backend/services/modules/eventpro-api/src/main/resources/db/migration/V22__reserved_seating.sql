-- Reserved seating (Pro/Enterprise): event flag and seat columns on tickets
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS reserved_seating_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE tickets
    ADD COLUMN IF NOT EXISTS seat_section VARCHAR(100),
    ADD COLUMN IF NOT EXISTS seat_row VARCHAR(20),
    ADD COLUMN IF NOT EXISTS seat_number INT;

CREATE INDEX IF NOT EXISTS idx_tickets_event_seat ON tickets(event_id) WHERE seat_section IS NOT NULL;
COMMENT ON COLUMN events.reserved_seating_enabled IS 'Pro/Enterprise: when true, event uses seat map; tickets are sold by specific seat';
COMMENT ON COLUMN tickets.seat_section IS 'Reserved seating: section name (e.g. Orchestra)';
COMMENT ON COLUMN tickets.seat_row IS 'Reserved seating: row label (e.g. A, B)';
COMMENT ON COLUMN tickets.seat_number IS 'Reserved seating: seat number in row';
