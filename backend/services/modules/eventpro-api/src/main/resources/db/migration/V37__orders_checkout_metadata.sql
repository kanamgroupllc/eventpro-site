-- Checkout attribution and ticket delivery preferences (guest + stored on order)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS how_did_you_hear VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS receive_ticket_via_whatsapp BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS receive_ticket_via_sms BOOLEAN DEFAULT FALSE;
