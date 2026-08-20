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

6. Seed test data:

```bash
npm run seed:supabase
```

Test credentials:

- Super Admin: `admin@kgr.ac.in` / `admin123`
- Faculty: `umashankar@kgr.ac.in` / `123dskgr`
- Student: `karthikeyan@kgr.ac.in` / `password123`

## Local API Testing

The API files in `api/` are Vercel serverless functions. The local adapter in `server/local-api.mjs` runs those same handlers during `npm run dev`.

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

Add these Vercel environment variables:

```bash
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
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
