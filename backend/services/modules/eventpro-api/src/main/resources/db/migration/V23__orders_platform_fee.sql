-- Platform fee (percentage of order total) withheld per order; used for 1099-K and payouts.
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2) NOT NULL DEFAULT 0;
COMMENT ON COLUMN orders.platform_fee IS 'Platform fee withheld for this order; used for 1099-K fees withheld and net payout';
