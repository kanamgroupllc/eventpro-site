-- A cart row is ownership of one physical ticket reservation. Historical rows that claimed
-- multiple tickets only held one ticket and cannot be reconstructed safely, so reset them.
DO $$
DECLARE invalid_rows integer;
DECLARE expired_rows integer;
DECLARE expired_cart_rows integer;
DECLARE due_ticket_ids uuid[];
BEGIN
    SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO due_ticket_ids
      FROM tickets
     WHERE ticket_status = 'RESERVED'
       AND (reserved_until IS NULL OR reserved_until <= CURRENT_TIMESTAMP);

    UPDATE tickets
       SET ticket_status = 'AVAILABLE', reserved_until = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE id = ANY(due_ticket_ids);
    GET DIAGNOSTICS expired_rows = ROW_COUNT;

    DELETE FROM carts WHERE ticket_id = ANY(due_ticket_ids);
    GET DIAGNOSTICS expired_cart_rows = ROW_COUNT;

    SELECT COUNT(*) INTO invalid_rows FROM carts WHERE quantity <> 1;

    UPDATE tickets t
       SET ticket_status = 'AVAILABLE', reserved_until = NULL, updated_at = CURRENT_TIMESTAMP
      FROM carts c
     WHERE c.ticket_id = t.id
       AND c.quantity <> 1
       AND t.ticket_status = 'RESERVED';

    DELETE FROM carts WHERE quantity <> 1;
    RAISE NOTICE 'Expired % due hold(s) and removed % owning cart row(s)', expired_rows, expired_cart_rows;
    RAISE NOTICE 'Reset % invalid multi-quantity cart row(s)', invalid_rows;
END $$;

-- Existing valid rows for one user must share the earliest active hold deadline.
WITH deadlines AS (
    SELECT c.user_id, MIN(t.reserved_until) AS expires_at
      FROM carts c
      JOIN tickets t ON t.id = c.ticket_id
     WHERE t.ticket_status = 'RESERVED' AND t.reserved_until IS NOT NULL
     GROUP BY c.user_id
)
UPDATE tickets t
   SET reserved_until = d.expires_at
  FROM carts c
  JOIN deadlines d ON d.user_id = c.user_id
 WHERE c.ticket_id = t.id AND t.ticket_status = 'RESERVED';

ALTER TABLE carts ADD CONSTRAINT ck_cart_one_physical_ticket CHECK (quantity = 1);
CREATE INDEX IF NOT EXISTS idx_cart_user_created ON carts(user_id, created_at);
