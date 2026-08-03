-- Donations & fundraising (Pro/Enterprise): event-level flag and order donation amount
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS donations_enabled BOOLEAN NOT NULL DEFAULT FALSE;
COMMENT ON COLUMN events.donations_enabled IS 'Pro/Enterprise only; when true, checkout shows optional donation';

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS donation_amount DECIMAL(10,2) NOT NULL DEFAULT 0;
COMMENT ON COLUMN orders.donation_amount IS 'Optional donation amount included in order total';

-- Custom domain (Pro/Enterprise): hostname for event page e.g. tickets.churchname.org
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255);
COMMENT ON COLUMN events.custom_domain IS 'Pro/Enterprise only; custom hostname for event page';
