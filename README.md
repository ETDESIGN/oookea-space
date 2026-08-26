# Oookea Space — Client Portal

Customer-facing project portal for **Oookea — Digital Atelier**. Clients see
their projects, live progress, invoices (+ PDF download), a real file vault,
and messaging — all in real time via Convex subscriptions.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Convex (database, file storage, real-time functions)
- Tailwind CSS v4 + shadcn/ui + Framer Motion
- Deployed on Netlify (auto-deploy from `main`)

## Security model

- Custom session auth: login issues a random 32-byte token stored server-side
  (`sessions` table, 30-day TTL). Every Convex function validates the token.
- Passwords: PBKDF2-SHA256, 100k iterations (transparent upgrade from legacy
  formats on login).
- Server-side authorization on every function: clients are forced to their own
  data scope; admin operations reject non-admin tokens; password hashes are
  never returned to the client.
- Seed functions are disabled in production.

## Development

```bash
npm install
npx convex dev        # link a Convex deployment (interactive)
cp .env.local.example .env.local   # set NEXT_PUBLIC_CONVEX_URL
npx next dev
```

## Environment

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL |

## Structure

```
convex/
  auth.ts         # session helpers (requireUser/requireAdmin/scopeClientId)
  users.ts        # auth, sessions, client management, password hashing
  projects_impl.ts# projects + deliverables
  invoices.ts     # invoices (+ client notifications on send/paid)
  files.ts        # Convex storage-backed file vault
  messages.ts     # threads + messages (+ cross-party notifications)
  misc.ts         # modules, activity log, disabled seed functions
  notifications.ts# per-user notification feed
src/
  app/            # client pages + /admin console + /api/file/[storageId]
  components/     # UI (header bell = live notification feed)
  lib/auth.tsx    # AuthProvider, ProtectedRoute, session token storage
```

## Credentials

Managed outside this repo. See the team password manager / internal wiki.
