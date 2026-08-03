-- Buyer state/country for jurisdiction-based sales tax (which state the purchaser was in).
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS buyer_state VARCHAR(10),
ADD COLUMN IF NOT EXISTS buyer_country VARCHAR(2);

COMMENT ON COLUMN orders.buyer_state IS 'Purchaser state code (e.g. CA, NY) for sales tax jurisdiction; from checkout.';
COMMENT ON COLUMN orders.buyer_country IS 'Purchaser country code (e.g. US) for tax jurisdiction.';
