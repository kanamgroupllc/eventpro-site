-- Speeds up atomic reserve-one (SELECT ... FOR UPDATE SKIP LOCKED) under high contention.
-- Query: WHERE event_id = ? AND ticket_type = ? AND ticket_status = 'AVAILABLE' ORDER BY id LIMIT 1
CREATE INDEX IF NOT EXISTS idx_tickets_available_reserve
  ON tickets (event_id, ticket_type, ticket_status)
  WHERE ticket_status = 'AVAILABLE';
