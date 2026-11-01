# BELIEVE STACK

BELIEVE STACK is a full-stack website for student and founder project development, built with:

- Frontend: React + Vite
- Backend: Node.js + Express + PostgreSQL

## Project structure

- `client/` - React frontend
- `server/` - Express API and database logic

## Local setup

1. Install frontend dependencies:
   `cd client && npm install`
2. Install backend dependencies:
   `cd server && npm install`
3. Start the frontend:
   `cd client && npm run dev`
4. Start the backend:
   `cd server && npm run dev`

## Frontend deployment (Vercel)

1. Push the repository to GitHub.
2. In Vercel, import the repository.
3. Set the root directory to `client`.
4. Use the build command:
   `npm install && npm run build`
5. Set the output directory:
   `dist`
6. Add environment variables:
   - `VITE_API_URL=https://your-render-backend-url.onrender.com`
7. Deploy.

For local mobile testing, start the frontend with `npm run dev -- --host 0.0.0.0` and the backend with `npm run dev` from `server`. Open the Vite site using your computer's LAN IP. Vite proxies `/api` requests to the backend on port `5000`, so allow inbound connections to port `5173` in the computer's firewall.

## Backend deployment (Render)

1. Create a new Web Service in Render.
2. Connect this GitHub repo and set the root directory to `server`.
3. Use the start command:
   `npm install && npm run db && npm run seed && npm start`
4. Add environment variables:
   - `DATABASE_URL=postgres://user:password@host:5432/database`
   - `JWT_SECRET=your-long-random-secret`
   - `CLIENT_ORIGIN=https://your-vercel-app.vercel.app`
   - `ADMIN_EMAIL=admin@believestack.dev`
   - `ADMIN_PASSWORD=StrongPassword123!`
   - `PORT=10000`
   - Optional mail values: `CONTACT_EMAIL`, `MAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
5. If the provider supports SSL-required Postgres, enable `DB_SSL=true`.
6. Deploy.

## Hosted PostgreSQL connection

The backend accepts either:

- a single `DATABASE_URL` value, or
- individual connection settings: `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`

This makes it compatible with hosted databases such as Render Postgres, Neon, Railway, and Supabase.

## Notes

- Copy `server/.env.example` to `server/.env` for local development.
- Keep secrets like `.env` files out of version control via the project `.gitignore`.
