-- Append-only audit stream for admin UI (security reviews, compliance). Prefer writes via AuditLogService (REQUIRES_NEW).
-- Scales with indexed time + category; full-text search can add GIN/trgm later if needed.

CREATE TABLE IF NOT EXISTS platform_audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_label VARCHAR(255) NOT NULL,
    action VARCHAR(200) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(100),
    category VARCHAR(30) NOT NULL,
    status_label VARCHAR(50),
    status_tone VARCHAR(20),
    summary TEXT NOT NULL,
    CONSTRAINT chk_audit_category CHECK (category IN ('finance', 'users', 'events', 'security', 'system'))
);

COMMENT ON TABLE platform_audit_events IS 'Immutable audit events for admin console; do not UPDATE/DELETE from app code.';

CREATE INDEX IF NOT EXISTS idx_platform_audit_created ON platform_audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_audit_category_created ON platform_audit_events(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_audit_actor ON platform_audit_events(actor_user_id) WHERE actor_user_id IS NOT NULL;
