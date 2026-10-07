# Oookea Space → Mission Control — Brainstorm v1

**Date:** 2026-10-07 · **Status:** Round 1 — for E's review
**North star:** `space.oookea.com/admin` becomes the first tab E opens every morning.
One screen that answers: *what's broken, what needs money/attention, what moved while I was away.*

---

## 0. Health check of current system (verified 2026-10-07)

| Check | Result |
|---|---|
| Netlify app `incredible-puffpuff-8e526b` | ✅ 200, live |
| Convex backend `quiet-kudu-739` | ✅ 200, live |
| Code | ✅ 70 Convex functions / 16 modules, 17 tables, auth hardened (PBKDF2, server-side scopes) |
| `space.oookea.com` | ❌ NXDOMAIN — DNS never pointed at Netlify (deferred item #1) |
| `oookea.com` apex | ❌ A record → 70.32.23.115 (dead A2 shared host, suspended-page redirect) |
| oookea.com DNS | ✅ Now ON CLOUDFLARE (zone active) — apex + `cpanel/ftp/webdisk/autoconfig` records still point at A2; email (Purelymail MX/SPF/DKIM) is correctly configured and must not be touched |
| Stray Convex deployment `decisive-avocet-981` | ⚠ still to delete (dashboard only) |
| Git history with old ACCESS.md secrets | ⚠ still there — rotate Convex deploy key when convenient |

**Conclusion: system healthy. No blocking issues. Ready to build on.**

---

## 1. Product vision — three-layer Mission Control

**Layer 1 — Deployments & domains (the "is anything on fire?")**
- Every Vercel project (28+), Netlify site, GitHub repo: latest deploy state, error badge on failure
- Domain monitor: expiry, DNS records, SSL via Cloudflare API (all 7 zones already on the account)
- Cert expiry + response-time checks → feed row into the "attention" column

**Layer 2 — Money & clients (already 70% exists)**
- Revenue / outstanding invoices (exists) + Stripe live balance feed (Test mode today for caneles)
- Client health: `lastLoginAt` already stored — surface "hasn't logged in for 14 days" as a signal
- Pipeline: active projects by client, deadlines this week, unapproved deliverables waiting on clients

**Layer 3 — Agents & automation (the "fleet")**
- Status of all E's agents and cron jobs (Hermes crons, OpenClaw/ESTUDIO Paperclip on estudio box, WhatsApp bridge)
- Dead-man's-switch: every important cron pings a heartbeat; silence = red badge on Mission Control
- Inbox-zero style queue: notifications, emails needing reply (dereck@oookea.com), messages across projects

---

## 2. Architecture (fits the existing app, no rewrite)

**Data plane:** Convex `integrations` + `integrationEvents` + `heartbeats` tables.
A `connector` framework: each integration = { provider, credentials ref, poll interval, last sync, health }.

**Collection pattern (matches E's event-driven preference — no heavy polling):**
1. **Push (preferred):** Netlify outgoing webhooks (`deploy_created/failed`), Stripe webhooks, GitHub webhooks → Convex **HTTP actions** (`/api/integration-webhook/:provider`, signed secret header). Real-time, zero waste.
2. **Scheduled snapshot (fallback):** Convex cron jobs (native `crons.ts`) hitting read-only APIs: Vercel REST (token exists on this Mac), Cloudflare REST (Global API key exists), GitHub REST (`gh` CLI already authed as ETDESIGN).
3. **Heartbeats:** agents/crons `GET https://space.oookea.com/api/heartbeat/:id` after each run; missed schedule → incident row + red tile.

**UI:** new `/admin/mission-control` as the admin root (current dashboard becomes a sub-tab).
Grid of **tiles**: global status strip (all-green pulse when nothing needs you), services, domains, money, agents, deadlines, unread messages, GitHub PRs/issues, recent events feed (last 24h audit trail).
Tile framework = generic widget loader so new feeds are config + a small widget component (mirrors the existing `modules` concept but admin-side).

**Credentials:** Convex env vars / an encrypted `credentials` table. Never in repo. (Netlify + Convex tokens still missing — see §4.)

---

## 3. Connect & harmonize — integration catalog (researched)

### Tier 1 — ship first (credentials already in hand)
| Integration | Source | Notes |
|---|---|---|
| Vercel deployments | REST API (token on this Mac works, 28 projects) | 2 RED projects spotted: `web` (ERROR), `hearth-api` (ERROR), + `oookea-space` mirror |
| Netlify deployments | outgoing webhooks → Convex HTTP action | main site lives here; token still needed for history backfill |
| Cloudflare (7 zones) | REST (Global API key verified) | domain expiry, DNS records, SSL; also fix `space.` + apex records |
| GitHub | `gh` CLI authed (ETDESIGN, repo+workflow scopes) | open PRs, failing checks, Actions status per repo |
| Internal heartbeats | native | NEAR trading bot, Paperclip/ESTUDIO cron, WhatsApp bridge health |

### Tier 2 — self-hosted building blocks (open source, connect easily)
| Tool | What it gives Mission Control |
|---|---|
| **Uptime Kuma** or **Checkmate** (checkmate.so) | pretty uptime + incidents; Checkmate also does pagespeed/hardware |
| **Gatus** (YAML, GitOps) | deep checks: ports, JSON body contracts, cert expiry, push heartbeats from cron |
| **Healthchecks.io (self-hosted)** | dead-man's-switch for cron jobs — pairs with Layer 3 |
| **Beszel** | lightweight server/container metrics (CPU/RAM/disk) as a tile |
| **Glance** (glanceapp/glance, 37k★) | feed-centric widgets: RSS, Reddit, HN, markets, custom-api JSON widgets — *the* dashboard to mine for widget ideas; has iframe + custom-api widgets |
| **Homepage (gethomepage.dev)** | 100+ service widgets — reference catalog for what connectors to build |
| **changedetection.io** | watch client sites / competitor pages / prices → alert tile |
| **Karakeep** (ex-Hoarder) | AI bookmark-everything — the "research pile" tile |
| **Shlink** | self-hosted shortener with visit analytics for client campaign links |
| **Miniflux / FreshRSS** | reading feed → "industry pulse" widget |
| **Umami / Plausible** | privacy-first analytics per client site (GA4 already wired for caneles) |
| **ntfy** | push channel: Mission Control events → phone (E already on WhatsApp; ntfy is the neutral bus) |
| **n8n / Activepieces** | connect anything without code once flows multiply |

**Stack pattern:** everything Docker, all reachable via Tailscale/Cloudflare Tunnel (pattern already proven by `oookea.qzz.io` tunnels), each exposing either an API Mission Control reads, or an iframe widget.

### Tier 3 — later / optional
- Backstage-style service catalog — overkill for a solo atelier; a `services` table in Convex covers the need
- Dokploy/Komodo (self-hosted PaaS) — only if E moves hosting off Vercel/Netlify
- Linear/Paperclip issue mirror — ESTUDIO issues live in Paperclip (port 3100); mirror assigned/open counts as a tile

---

## 4. Decisions — ANSWERED by E (2026-10-07)

1. **Keys:** E will pull NETLIFY_AUTH_TOKEN + CONVEX_DEPLOY_KEY himself (step-by-step given in chat). Blocks DNS cutover + schema pushes until then.
2. **Admin landing:** KEEP SWITCHER — `/admin/mission-control` exists alongside the current dashboard, no forced redirect.
3. **Tier-2 self-hosted:** undecided pending a recommendation (asked for more detail). Default lean: start 100% API-fed, add containers later only for gaps.
4. **Old `oookea-space` Vercel mirror:** E confirmed not used by anything → **DELETED 2026-10-07** (verified: project had only its default `oookea-space.vercel.app` domain, no custom domains, no aliases; DELETE → 204, GET → 404).
5. **`oookea.com` apex:** E has plans for a SEPARATE future website on the apex — DO NOT touch apex/www/A2 records. Only create `space.oookea.com` → Netlify. Email records stay untouched (as always).
6. **Tiles:** strictly ICON-BASED (selfh.st/icons + lucide) — Hermes's call, emoji-free for a professional look.

**Money model note (E):** NO direct payment system will be added. Instead, manual payment instructions ("how to pay our account") shown to clients. Layer 2 = invoices + payment-instructions content, NOT a Stripe live checkout feed.

---

## 5. Build order (once decisions land)

- **Round 2 (foundation):** fix DNS cutover (`space.oookea.com` → Netlify, apex optional) · `integrations` schema + connector framework · webhooks receiver · Vercel/Cloudflare/GitHub connectors · `/admin/mission-control` v1 with global status strip + service tiles · heartbeat endpoint + 3 first heartbeats (NEAR bot, Paperclip, WA bridge)
- **Round 3 (money + fleet):** Stripe feed · client-health signals (`lastLoginAt`) · deadlines/unapproved queue · ntfy push · event feed
- **Round 4 (harmonize):** Tier-2 containers if wanted · Glance-inspired widget polish · per-tile drilldown pages

---

## 6. Session state — end of Round 1 (2026-10-07)

**Done this round:**
- Health check executed and verified (results in §0)
- Local repo re-cloned to `~/Documents/DEV/oookea-space` (replaced the old empty folder)
- Integration research: 40+ sources scanned (dashboards, monitoring, webhooks, automation, catalogs)
- This brainstorm committed as `57c1938`

**Verified working credentials — locations only (NEVER put secrets in this public repo):**
- Vercel REST: token file `~/Documents/DEV/.vercel-token` (user `etdesign`) — ✅ tested, 28 projects listed
- Cloudflare: Global API key (kept in local KEYS.md / agent vault) — ✅ tested, 7 zones incl. `oookea.com`
- GitHub: `gh` CLI authed as `ETDESIGN` (repo + workflow scopes) — ✅
- Netlify + Convex: **no tokens found on this machine** — E to provide (blocks DNS cutover + schema pushes, §4.1)
- Stripe: TEST mode only (caneles) — no live keys yet

**Next session picks up at:**
1. E answers the 6 decisions in §4 (minimum: NETLIFY_AUTH_TOKEN + CONVEX_DEPLOY_KEY)
2. Execute `space.oookea.com` DNS cutover (Cloudflare zone ready, one CNAME)
3. Round 2 build per §5 (integrations schema → webhook receiver → connectors → mission-control v1 → heartbeats)
