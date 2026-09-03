# KGRCET Learning Portal

Modern Vite + React + TypeScript frontend for a role-based academic learning platform, with Vercel API functions connected to Supabase.

## Local Frontend

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173/login`.

`npm run dev` starts:

- local Supabase API adapter: `http://127.0.0.1:8787`
- Vite frontend: `http://127.0.0.1:5173`

For frontend-only local testing, login falls back to the demo credentials if the API is not available.

## Supabase Setup

1. Create a Supabase project.
2. Open Supabase SQL Editor.
3. Run `supabase/schema.sql`.
4. Copy `.env.example` to `.env`.
5. Fill in:

```bash
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_ANON_KEY="your-public-anon-key"
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_ANON_KEY="your-public-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

The API also supports Vercel Marketplace Supabase variables:

```bash
SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
SUPABASE_SECRET_KEY="your-secret-key"
```

6. Seed test data:

```bash
npm run seed:supabase
```

If you added sensitive Supabase variables in Vercel, `vercel env pull` may write `[SENSITIVE]` placeholders instead of plaintext secrets. For local seeding, create a local `.env` file with real Supabase values:

```bash
npm run seed:supabase
```

Seeded development credential:

- Super Admin: `admin@kgr.ac.in` / `admin123`

`npm run seed:supabase` clears seeded learning demo data and leaves only the Super Admin account. Use Super Admin to create faculty and student accounts during development.

## Local API Testing

The API files in `api/` are Vercel serverless functions. The local adapter in `server/local-api.mjs` runs those same handlers during `npm run dev`.

Available API routes:

```bash
GET    /api/health
POST   /api/login
POST   /api/bootstrap-admin
GET    /api/summary
GET    /api/users
POST   /api/users
PATCH  /api/users
DELETE /api/users?id=<user-id>
GET    /api/subjects
POST   /api/subjects
PATCH  /api/subjects
DELETE /api/subjects?id=<subject-id>
GET    /api/assignments
POST   /api/assignments
PATCH  /api/assignments
DELETE /api/assignments?id=<assignment-id>
```

Write operations require Super Admin credentials and a server-side Supabase service key:

```bash
curl -X POST http://127.0.0.1:8787/api/users \
  -H "Content-Type: application/json" \
  -H "X-Admin-Email: admin@kgr.ac.in" \
  -H "X-Admin-Password: admin123" \
  -d "{\"name\":\"Faculty Name\",\"email\":\"faculty@kgr.ac.in\",\"password\":\"change-me\",\"role\":\"faculty\",\"title\":\"Faculty\"}"
```

Use `POST /api/bootstrap-admin` only once on an empty database to create the first Super Admin. It requires the server-only `BOOTSTRAP_ADMIN_TOKEN` value in the `X-Bootstrap-Token` header and returns `409` after an admin already exists.

To test through Vercel CLI instead, run:

```bash
npm run dev:vercel
```

Then open `http://localhost:3000/login`.

## Production Build

```bash
npm run build
npm run preview
```

The deployable static output is generated in `dist/`.

## Deploy on Vercel

Add these Vercel environment variables, or connect Supabase from the Vercel Marketplace so Vercel syncs them for you:

```bash
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

If Vercel provides the newer Marketplace names, use:

```bash
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
```

Build command:

```bash
npm run build
```

Output directory:

```bash
dist
```

## Security Note

This prototype stores demo passwords in a simple table to match the current portal behavior. Before real production use, migrate to Supabase Auth or hashed passwords with server-only verification.
