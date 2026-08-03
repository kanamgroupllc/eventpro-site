# Creating the first admin user

There is no separate admin signup. Use one of these approaches to get your first admin.

---

## Option 1: Promote an existing user (simplest)

If you already have a user (e.g. from normal signup):

1. Sign up or log in as that user in the app.
2. In the database, set their role to `ADMIN`:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'your@email.com';
```

3. Log in again (or refresh). You’ll see **Admin Dashboard** in the nav and can open `/admin`.

---

## Option 2: Seed admin via migration

A Flyway migration can create one admin user when the DB has no admins yet.

- **Migration:** `V28__seed_first_admin.sql` (see below).
- **Seeded account:**  
  - Email: `admin@eventpro.local`  
  - Password: `password`  
- **Important:** Change this password after first login (e.g. via Profile / Settings if you add a change-password flow, or by updating `password_hash` in the DB with a new BCrypt hash).

The migration only runs once. To avoid affecting production, you can:

- Use it only in dev/staging, or  
- Remove/rename it before deploying to production and use Option 1 or 3 instead.

## Option 2b: Local/Dev startup seed

The API also seeds a development admin account on startup for the `local`, `lstk`, and `dev` Spring profiles:

- Email: `admin@event.com`
- Password: `Password@123`

This seed is idempotent and only inserts the account when that email does not already exist. It is intentionally not active for production profiles.

For AWS dev RDS, connect with the live RDS endpoint, port `5432`, database `eventprodb`, username `accessplus`, and the password from the RDS managed master user secret in AWS Secrets Manager.

---

## Option 3: Insert admin manually in the DB

Use this when you want a one-off admin and no migration.

1. Generate a BCrypt hash for the password you want (e.g. with a small Java class using `BCryptPasswordEncoder`, or an online BCrypt tool).
2. Insert a row into `users`:

```sql
INSERT INTO users (
  id,
  email,
  password_hash,
  first_name,
  last_name,
  status,
  role
) VALUES (
  gen_random_uuid(),
  'admin@yourdomain.com',
  '$2a$10$...',  -- your BCrypt hash
  'Admin',
  'User',
  'ACTIVE',
  'ADMIN'
);
```

3. After other migrations, the table may have more columns; they have defaults, so this minimal insert is enough. If your schema has `subscription_tier`, `is_verified`, `verification_status`, `risk_level`, `w9_submitted`, `branding_hide_platform`, etc., they will get their default values.

---

## After you have one admin

- Log in with that admin account and go to **Admin → User Management**.
- Use **Create admin user** to add more admins via the UI (no DB access needed).
