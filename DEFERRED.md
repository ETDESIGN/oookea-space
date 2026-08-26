# OookeA Space — Deferred Items (tackle later)

**Created:** 2026-08-26 · **From:** hardening engagement P0–P4

## 1. space.oookea.com domain — ALMOST DONE, needs 2 steps
DNS is on a2hosting (ns1–ns4.a2hosting.com), but `space.oookea.com` currently
points to `70.32.23.115` (the old A2 shared host, serving a "suspended page"
redirect). It is NOT pointing at Netlify yet.

To finish:
1. Netlify: Domain settings → Add `space.oookea.com` → copy the Netlify DNS
   target (e.g. `oookea-space.netlify.app` / lb endpoint).
2. A2 hosting DNS zone: replace the `space` A record (70.32.23.115) with a
   CNAME → `<netlify-site-name>.netlify.app` (or Netlify's load-balancer IPs
   75.2.60.5 / 99.83.190.102 as A records).
3. Wait for the Netlify-issued HTTPS cert (automatic once verified).
   Optional: verify `oookea.com` as a domain in Netlify for apex redirect.

## 2. Email notifications (needs an email provider)
- Resend or Postmark account + API key in Convex env vars.
- Trigger points already exist server-side (`sendMessage`,
  `updateInvoiceStatus`) — extend with a Convex action that sends email via
  HTTP when a notification row is created, gated by the user's
  `notifications` preference flags (already stored in profile).

## 3. Self-service password reset
- `passwordResetTokens` table (token, userId, expiry).
- "Forgot password" → mutation creates token → emails link (needs #2 first).
- `/reset-password?token=…` page → `resetPasswordWithToken` mutation.
- Fallback until then: admin resets via /admin/clients (works today).

## 4. ACCESS.md secrets in git history
- ACCESS.md was sanitized + gitignored in c6ab3f6, but old commits still
  contain the truncated deploy key + plaintext passwords.
- If ever needed: `git filter-repo` to purge history, or rotate the Convex
  deploy key (recommended once) + force-push.

## 5. Stray Convex deployment to delete
- `decisive-avocet-981` (accidentally created during CLI linking; empty).
  Delete from dashboard.convex.dev to avoid confusion.

## 6. Credential hygiene (from audit)
- Admin password is the shared default. After domain goes live, rotate to a
  unique password (Settings → Change Password works now).
- Sarah/Pierre demo accounts: keep inactive, or delete via admin UI.
