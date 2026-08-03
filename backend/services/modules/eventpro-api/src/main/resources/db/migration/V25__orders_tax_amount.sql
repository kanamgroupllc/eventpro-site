-- Sales tax / VAT: amount applied to order (e.g. subtotal * rate). Default 0 until tax is enabled.
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN orders.tax_amount IS 'Tax (sales tax/VAT) amount for this order; 0 when tax not applied.';
