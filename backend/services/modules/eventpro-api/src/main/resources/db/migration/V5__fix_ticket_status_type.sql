-- Flyway Migration: V5__fix_ticket_status_type.sql
-- Description: Convert ticket status and type from PostgreSQL ENUM to VARCHAR for JPA compatibility
-- Database: PostgreSQL 15+

-- Fix ticket_status column
ALTER TABLE tickets DROP COLUMN IF EXISTS ticket_status;

ALTER TABLE tickets
    ADD COLUMN ticket_status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE';

ALTER TABLE tickets
    ADD CONSTRAINT chk_ticket_status
    CHECK (ticket_status IN ('AVAILABLE', 'SOLD', 'RESERVED'));

-- Fix ticket_type column
ALTER TABLE tickets DROP COLUMN IF EXISTS ticket_type;

ALTER TABLE tickets
    ADD COLUMN ticket_type VARCHAR(50) NOT NULL;

ALTER TABLE tickets
    ADD CONSTRAINT chk_ticket_type
    CHECK (ticket_type IN ('VIP', 'REGULAR', 'EARLY_BIRD'));

-- Recreate indexes
CREATE INDEX idx_ticket_status ON tickets(ticket_status);
CREATE INDEX idx_ticket_type ON tickets(ticket_type);

-- Optionally drop the enum types if not used elsewhere
-- DROP TYPE IF EXISTS ticket_status;
-- DROP TYPE IF EXISTS ticket_type;