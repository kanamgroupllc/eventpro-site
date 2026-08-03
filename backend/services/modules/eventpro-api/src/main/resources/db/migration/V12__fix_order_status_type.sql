-- Flyway Migration: V12__fix_order_status_type.sql
-- Description: Convert order status from PostgreSQL ENUM to VARCHAR for JPA compatibility
-- Database: PostgreSQL 15+

ALTER TABLE orders DROP COLUMN IF EXISTS status;

ALTER TABLE orders
    ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'PENDING';

ALTER TABLE orders
    ADD CONSTRAINT chk_order_status
    CHECK (status IN ('PENDING', 'PAID', 'CANCELLED', 'REFUNDED'));

CREATE INDEX idx_order_status ON orders(status);
