# Round 3 Roadmap — external AI brainstorm synthesis (2026-10-10)

Inputs: Gemini 3.1 Pro (`/tmp/brainstorm/gemini.txt`), GPT-5.6 via Codex (`/tmp/brainstorm/codex.txt`),
web research (Promethean agency-retention study, client-portal market scan), Hermes' own analysis.

## Convergent picks (all sources agree)

1. **Morning Brief + Action Queue** (Gemini #1/#2, Codex #1) — THE daily-driver feature.
   Daily 8am digest via Discord/ntfy: apps down, deploys since yesterday, invoices overdue,
   deadlines <7d, clients gone quiet. Every item has one next action; acknowledge/snooze clears it.
   Empty queue = day's ops done.
2. **Client value reporting** (Gemini #4, Codex #3/#7, Promethean "report in the client's numbers")
   — plain-English "what changed" update drafts (E approves → posts to client page) +
   monthly branded recap (uptime, work shipped, requests done, next priorities). Retention collateral.
3. **Client health = renewal risk scorecard** (Codex #5; already Round-3 plan) — transparent rules:
   last meaningful contact, unresolved requests, recent incidents, overdue invoice, next renewal.
   Red/yellow flag requires a next relationship action.
4. **Commitments queue** (Codex #6; refines E's deadlines idea) — every promise gets date + status;
   crucially "waiting on client" items go stale → one-click follow-up message.
5. **Kill list (all agree)**: ❌ in-app chat/ticketing (structured intake form → Action Queue instead),
   ❌ RBAC/roles, ❌ accounting/ledger/payment processor (E's decision, reaffirmed), ❌ notification-bell
   state machine (push + queue covers it), ❌ general PM suite (don't fight Linear/Notion/Slack).

## Strong unique ideas

- **Cmd+K universal palette** (Gemini #3) — type "caneles" → Enter opens site, ⌘Enter repo,
  copy-creds action, vscode:// deep link. Keyboard-first = solo-dev leverage.
- **Client Vault** (Gemini #5) — branded downloads: logos, brand colors, past invoice PDFs.
  Kills "can you email our logo again?" pairs perfectly with the money view.
- **Loom-style video updates** (Gemini #6) — paste URL in drawer → embeds on client page.
- **Incident objects** (Codex #4) — not more monitoring: one incident per outage with client impact,
  timeline, resolution note; status pages get reassuring language + postmortem snippet.
- **Webhook-first event inbox** (Codex #9) — probes demoted to availability fallback; matches
  E's push-first architecture preference.
- **GA4 business metrics on client pages** (Gemini #4) — we already hold caneles GA4 access;
  visitors/leads next to uptime = retainer justification.

## Security tension (Codex #10 — CUT creds/paths from drawers)

Codex flags stored credentials + local paths in Fleet drawers as a liability.
E explicitly requested this ("this place should be the first place I look"). Resolution:
KEEP (E's call) but harden: reveal-on-click for passwords, no password in DOM until revealed,
consider passphase-only references + KEYS.md links for prod-grade secrets. Admin-only already.

## Proposed build order (Round 3)

- **R3a — Morning Brief + Action Queue** ✅ SHIPPED 2026-10-10
  (actionQueue table, brief.ts sync/send, queue-sync cron 10min, brief cron 08:00 HKT,
  MC dashboard panel with Done/Snooze, ntfy header-mode push — JSON mode broken ntfy-side 40024)
- **R3b — Money view** ✅ SHIPPED 2026-10-10
  (paymentSettings table + convex/payment.ts moneyOverview; "How to pay" card on client invoice pages
  for sent/overdue; admin editor dialog + KPI strip; daily overdue sweep 03:00 UTC; Client Vault = pre-existing /files.
  E still to fill real bank details via the admin editor.)
- **R3c — Commitments queue + client health + quiet-client nudges** ✅ SHIPPED 2026-10-10
  (commitments table + /admin/mission-control/commitments; clientHealth transparent rules on
  lastLogin/thread lastMessage; Clients table Health column; Action Queue reconciles overdue
  invoices + stale waiting-on-client (5d) + quiet clients (35d); verified live: Florian red/43d)
- **R3d — Client value reports** (what-changed drafts, monthly recap, GA4 inject)
- **R3e — Cmd+K palette + incident objects** (polish layer)
