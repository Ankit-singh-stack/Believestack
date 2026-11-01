# BELIEVE STACK

BELIEVE STACK is a full-stack website for student and founder project development, built with:

- Frontend: React + Vite
- Backend: Node.js + Express + MongoDB

## Project structure

- `client/` - React frontend
- `server/` - Express API and database logic

## Local setup

1. Install frontend dependencies:
   `cd client && npm install`
2. Install backend dependencies:
   `cd server && npm install`
3. Copy `server/.env.example` to `server/.env` and configure MongoDB and the admin account.
4. Initialize MongoDB indexes and seed starter content:
   `cd server && npm run db && npm run seed`
5. Start the frontend:
   `cd client && npm run dev`
6. Start the backend:
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
   - `MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<database>`
   - `MONGODB_DB=believestack`
   - `JWT_SECRET=your-long-random-secret`
   - `CLIENT_ORIGIN=https://your-vercel-app.vercel.app`
   - `ADMIN_EMAIL=admin@believestack.dev`
   - `ADMIN_PASSWORD=StrongPassword123!`
   - `PORT=10000`
   - Optional mail values: `CONTACT_EMAIL`, `MAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
5. Deploy.

## MongoDB connection

Set `MONGODB_URI` to a MongoDB connection string for a local instance or hosted cluster. `MONGODB_DB` optionally overrides the database name and defaults to `believestack`.

## Notes

- Copy `server/.env.example` to `server/.env` for local development.
- Keep secrets like `.env` files out of version control via the project `.gitignore`.
