# KGRCET Learning Portal

Modern Vite + React + TypeScript frontend for a role-based academic learning platform.

## Local setup

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173/login`.

`npm run dev` starts both:

- local API: `http://127.0.0.1:8787`
- Vite frontend: `http://127.0.0.1:5173`

The local database is seeded from `server/db.seed.json` into `server/db.local.json`.
The local database file is ignored by Git so test changes do not get committed.

Test credentials:

- Super Admin: `admin@kgr.ac.in` / `admin123`
- Faculty: `umashankar@kgr.ac.in` / `123dskgr`
- Student: `karthikeyan@kgr.ac.in` / `password123`

## Production build

```bash
npm run build
npm run preview
```

The deployable static output is generated in `dist/`.

## Deploy

- Vercel: import the project and use `npm run build` with output directory `dist`.
- Netlify: `netlify.toml` is already configured.
- Static hosting: upload the contents of `dist/`.

The app is a static frontend prototype. Connect the login form to a real auth/API service before production use with real users.
