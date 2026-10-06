# Bible Study Workspace

An offline-first Progressive Web App for reading Scripture, highlighting verses, taking notes, organizing sermons, and journaling prayers — synced across devices.

## Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, React Router, TanStack Query, Zustand, TipTap, Framer Motion
- **Backend**: Supabase (Postgres, Auth, Storage, Realtime)
- **PWA**: `vite-plugin-pwa` (Workbox service worker), IndexedDB (via `idb`) for offline cache + sync queue, Background Sync, Push Notifications

## Getting started

```bash
npm install
cp .env.example .env   # fill in your Supabase project URL + anon key
npm run dev
```

The app runs fully offline in **local mode** if Supabase env vars are not set — data is stored in IndexedDB. Once configured, the app queues local mutations and syncs them to Supabase automatically when back online (and via the Background Sync API where supported).

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Run the 4 numbered migrations in `supabase/migrations/` (see `supabase/README.md`) to create all tables, indexes, RLS policies, storage buckets, and enable Realtime.
3. Run `npm run import:web-bible` (with `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`) to import the full public-domain **World English Bible** text — see `supabase/README.md` for details and how to add more translations later.
4. Enable **Email** auth under Authentication → Providers, and enable "Confirm email" for email verification.
5. Enable **Google** auth under Authentication → Providers, and set the redirect URL to `https://<your-domain>/auth/callback` (and `http://localhost:5173/auth/callback` for local dev) in both Supabase and the Google Cloud Console OAuth client.
6. Copy your Project URL and anon public key into `.env`.

## Authentication features

- Email sign up with email verification (resend from Profile or the in-app banner)
- Email/password login, Google OAuth login
- Forgot password (`/forgot-password`) → reset link → `/reset-password`
- Session persistence + auto login (Supabase session stored and refreshed automatically)
- Protected routes (`ProtectedRoute`) — redirects unauthenticated users to `/login` when Supabase is configured; app remains usable in local-only mode otherwise
- Profile page (`/profile`) with avatar upload (Supabase Storage), display name, password change
- User preferences: language, theme, font size, reading preferences (translation, reading font, line spacing, verse numbers) — persisted locally and applied instantly across the app

## Architecture

```
src/
  components/   Reusable UI (ui/, layout/, editor/)
  pages/        Route-level views
  features/     Feature-scoped modules (bible-reader)
  hooks/        Custom hooks (theme, online status, push notifications)
  services/     Supabase client, IndexedDB, Bible text fetching, sync engine
  stores/       Zustand stores (auth, theme, ui, bible, notes, sermons, prayer)
  types/        Shared TypeScript types
  utils/        Bible book metadata, class-name helper
```

## PWA features

- Installable (manifest + icons)
- Offline navigation and cached Bible chapters (network-first with cache fallback)
- IndexedDB-backed local database for notes, sermons, prayers, highlights, bookmarks
- Sync queue flushed on reconnect and via Background Sync
- Push notification permission + display hook (`usePushNotifications`)

## Production build

```bash
npm run build
npm run preview
```
