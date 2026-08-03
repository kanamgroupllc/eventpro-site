-- One-time backfill from operational tables (bounded) so the admin UI has history without scanning hot tables on every request.
-- New activity should be appended via AuditLogService going forward.

INSERT INTO platform_audit_events (
    id, created_at, actor_user_id, actor_label, action, entity_type, entity_id,
    category, status_label, status_tone, summary
)
SELECT * FROM (
    SELECT gen_random_uuid(),
           o.order_date::timestamptz,
           o.user_id,
           COALESCE(SUBSTRING(u.email FROM 1 FOR 255), SUBSTRING(o.guest_email FROM 1 FOR 255), 'unknown'),
           'ORDER_PAID',
           'ORDER',
           o.id::text,
           'finance',
           'SUCCESS',
           'success',
           'Order ' || o.order_number || ' paid (total ' || o.total_amount::text || ')'
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    WHERE o.status = 'PAID'
    ORDER BY o.order_date DESC
    LIMIT 400
) x;

INSERT INTO platform_audit_events (
    id, created_at, actor_user_id, actor_label, action, entity_type, entity_id,
    category, status_label, status_tone, summary
)
SELECT * FROM (
    SELECT gen_random_uuid(),
           u.created_at::timestamptz,
           u.id,
           SUBSTRING(u.email FROM 1 FOR 255),
           'USER_REGISTERED',
           'USER',
           u.id::text,
           'users',
           'INFO',
           'info',
           'New account — role ' || COALESCE(u.role, 'USER')
    FROM users u
    ORDER BY u.created_at DESC
    LIMIT 300
) y;

INSERT INTO platform_audit_events (
    id, created_at, actor_user_id, actor_label, action, entity_type, entity_id,
    category, status_label, status_tone, summary
)
SELECT * FROM (
    SELECT gen_random_uuid(),
           e.created_at::timestamptz,
           org.id,
           SUBSTRING(COALESCE(TRIM(org.first_name || ' ' || org.last_name), org.email) FROM 1 FOR 255),
           'EVENT_RECORD',
           'EVENT',
           e.id::text,
           'events',
           e.status::text,
           'neutral',
           'Event "' || SUBSTRING(e.name FROM 1 FOR 200) || '" — status ' || e.status::text
    FROM events e
    JOIN users org ON e.organizer_id = org.id
    ORDER BY e.created_at DESC
    LIMIT 300
) z;
