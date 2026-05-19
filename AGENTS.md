# AGENTS.md — Oookea Space (Client Portal)

## Project Overview
**Product:** Oookea Space — Client-facing project management portal
**Company:** Oookea — Digital Atelier (E-Studio client project)
**Stack:** Next.js 15, TypeScript, shadcn/ui v4, Tailwind CSS, Convex, Framer Motion
**Live URL:** https://incredible-puffpuff-8e526b.netlify.app
**Brand:** Oookea — Digital Atelier

## Architecture
- **Frontend:** Next.js 15 App Router, React, TypeScript
- **Backend:** Convex (real-time database + file storage + functions)
- **Auth:** Custom email/password with SHA-256 hashing via Web Crypto API
- **Deploy:** Netlify (auto-deploys from GitHub `main` branch)
- **No WordPress** — originally planned, switched to Convex

## Key Rules

### DO
- Use CSS variables for colors (dark mode support)
- Use shadcn/ui components (v4 — NO `asChild` prop, causes build errors)
- Use Convex hooks: `useQuery`, `useMutation` for data
- Import Convex from correct relative paths:
  - Pages in `src/app/`: `../../../convex/_generated/...`
  - Pages in `src/app/admin/`: `../../../../convex/_generated/...`
- Keep sidebar ALWAYS dark (`#0F172A`) regardless of dark mode
- Test both admin and client views

### DON'T
- Don't use `asChild` prop on shadcn components (v4 incompatible)
- Don't use raw hex colors — use CSS variables
- Don't expose admin features to client role
- Don't hardcode credentials

## Design Tokens
- **Primary:** `#6366F1` (indigo) / dark mode: `#818CF8`
- **Sidebar:** `#0F172A` (always dark)
- **Accent colors:** Green `#22C55E`, Amber `#F59E0B`, Red `#EF4444`, Purple `#8B5CF6`
- **Font:** Geist (via Next.js font optimization)

## Pages

### Client Pages
| Route | Description |
|-------|-------------|
| `/login` | Sign in |
| `/dashboard` | Client dashboard |
| `/projects` | Project list |
| `/projects/[id]` | Project detail |
| `/invoices` | Invoice list |
| `/invoices/[id]` | Invoice detail + PDF |
| `/files` | File vault (upload to Convex storage) |
| `/messages` | Messaging hub |
| `/modules` | Module embeds |
| `/settings` | Settings |

### Admin Pages
| Route | Description |
|-------|-------------|
| `/admin` | Admin dashboard |
| `/admin/clients` | Client CRUD |
| `/admin/clients/[id]` | Client detail |
| `/admin/projects` | Project management |
| `/admin/invoices` | Invoice management |
| `/admin/uploads` | File uploads |
| `/admin/messages` | Admin messaging |

## Convex Schema (9 tables)
- `users`, `projects`, `invoices`, `invoiceItems`, `files`, `messages`, `modules`, `settings`, `activities`

## Credentials
See `ACCESS.md` in repo root.

## Known Polish Items
- Settings "Save" button needs Convex mutation wired
- "Forgot password" link needs email service
- Notification bell needs real-time subscription
- Module embed iframes depend on module type
- Custom domain setup (space.oookea.com) — needs DNS config
- Logo integration — 2 concepts generated, pending selection

## Related Files
- **Blueprint:** `~/.openclaw/workspace/oookea-client-portal/blueprint.md`
- **Stitch Designs:** `~/.openclaw/workspace/oookea-client-portal/stitch_oookea_client_portal_ui/`
- **Build Session Log:** `~/.openclaw/workspace/memory/2026-04-22.md`
