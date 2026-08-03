-- Support guest checkout: nullable user_id and guest contact fields
ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_first_name VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_last_name VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_orders_guest_email ON orders(guest_email) WHERE guest_email IS NOT NULL;
