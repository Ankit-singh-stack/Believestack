# BELIEVE STACK API

## Database setup

1. Copy `.env.example` to `.env` and set `MONGODB_URI`, optionally `MONGODB_DB`, a random `JWT_SECRET` (at least 32 characters), and the admin account email/password. Use a unique admin password with at least 12 characters.
2. Ensure the MongoDB server or hosted cluster in `MONGODB_URI` is reachable.
3. From this directory, run:

   ```powershell
   npm install
   npm run db
   npm run seed
   npm run dev
   ```

`db:migrate` verifies the MongoDB connection and initializes required indexes. `seed` creates/updates the admin using the hashed `ADMIN_PASSWORD` and inserts initial public content only when it is absent. Neither script stores a plaintext admin password.

The API will not start if MongoDB or `JWT_SECRET` is unavailable. The health endpoint checks the live database connection.

## Environment variables

- `MONGODB_URI` (required; local or hosted MongoDB connection string)
- `MONGODB_DB` (optional database name; defaults to `believestack`)
- `JWT_SECRET` (random secret, at least 32 characters)
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and optionally `ADMIN_NAME` (required by the seed command)
- `CLIENT_ORIGIN` (frontend origin; comma-separated origins are supported)
- `PORT` (defaults to `5000`)
- Enquiry notifications are sent to `belivestack1316@gmail.com`. Configure `SMTP_USER` and `SMTP_PASS` with that Gmail account and a Google app password; Gmail SMTP defaults to `smtp.gmail.com:465`. `MAIL_FROM` may set the sender address. Do not commit the app password.

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

Run backend tests with `npm test`. The MongoDB API integration test requires a reachable MongoDB instance, a seeded admin, and the environment values above. From `client`, run `npm install`, `npm run dev`, `npm run build`, or `npm run lint`.
