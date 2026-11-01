# BELIEVE STACK API

## Database setup

1. Copy `.env.example` to `.env` and set `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `DB_SSL`, a random `JWT_SECRET` (at least 32 characters), and the admin account email/password. Use a unique admin password with at least 12 characters.
2. Create the database named by `PGDATABASE` using your PostgreSQL administrator account.
3. From this directory, run:

   ```powershell
   npm install
   npm run db
   npm run seed
   npm run dev
   ```

`db:migrate` initializes or upgrades tables from `database/schema.sql`. `seed` creates/updates the admin using the hashed `ADMIN_PASSWORD` and inserts initial public content only when it is absent. Neither script stores a plaintext admin password.

The API will not start if PostgreSQL or `JWT_SECRET` is unavailable. The health endpoint checks the live database connection.

## Environment variables

Use either:

- `DATABASE_URL` for hosted PostgreSQL providers such as Render, Neon, Railway, or Supabase, or
- `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, and `PGPASSWORD`

Additional settings:

- `DB_SSL` (`true` when the PostgreSQL provider requires SSL)
- `JWT_SECRET` (random secret, at least 32 characters)
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and optionally `ADMIN_NAME` (required by the seed command)
- `CLIENT_ORIGIN` (frontend origin; comma-separated origins are supported)
- `PORT` (defaults to `5000`)
- `PG_POOL_MAX` (optional connection-pool size; defaults to `10`)
- Optional mail settings: `CONTACT_EMAIL`, `MAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`

## API

Public routes:

- `GET /api/health`
- `GET /api/projects`, `GET /api/projects/:slug`, `GET /api/project-categories`
- `GET /api/services`, `GET /api/faqs`, `GET /api/testimonials`, `GET /api/site-settings`
- `POST /api/enquiries`

Admin routes require the HTTP-only `adminToken` cookie:

- `POST /api/admin/auth/login`, `POST /api/admin/auth/logout`, `GET /api/admin/auth/me`
- `GET /api/admin/dashboard`
- CRUD: `/api/admin/projects`, `/api/admin/categories`, `/api/admin/services`, `/api/admin/faqs`, `/api/admin/testimonials`
- `GET/PATCH/DELETE /api/admin/enquiries/:id`, `GET /api/admin/enquiries`, `POST /api/admin/enquiries/:id/notes`
- `GET/PATCH /api/admin/site-settings`

Collection endpoints support `page`, `limit` (maximum 100), and `search`; enquiries also support `status`, and projects support `status` and `categoryId`.

## Tests and frontend

Run backend tests with `npm test`. The PostgreSQL API integration test requires a migrated, seeded database and the environment values above. From `client`, run `npm install`, `npm run dev`, `npm run build`, or `npm run lint`.
