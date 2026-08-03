-- Seed one admin user when no admin exists (e.g. fresh install / dev).
-- Default password: 'password' — change after first login.
-- To skip this in production, remove or rename this migration before deploy.

INSERT INTO users (
    id,
    email,
    password_hash,
    first_name,
    last_name,
    status,
    role
)
SELECT
    gen_random_uuid(),
    'admin@eventpro.local',
    '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG',
    'Admin',
    'User',
    'ACTIVE',
    'ADMIN'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = 'ADMIN');
