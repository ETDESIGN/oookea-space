import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// ─── Mission Control fallback sweeps ─────────────────────────────
// Push-first architecture: webhooks + heartbeats deliver data in real
// time. These jobs are the safety net only (dead machine → status flips
// even without any incoming ping; provider snapshots once an hour).

// Heartbeat liveness sweep — flips silent monitors to "missed".
crons.interval(
  "heartbeat-sweep",
  { minutes: 10 },
  internal.heartbeats.sweepHeartbeats,
  {}
);

// Hourly provider snapshots (skip when credentials are absent — the
// actions mark integrations "setup" and exit cheaply).
crons.hourly(
  "vercel-snapshot",
  { minuteUTC: 7 },
  internal.snapshots.refreshVercel,
  {}
);

crons.hourly(
  "cloudflare-snapshot",
  { minuteUTC: 17 },
  internal.snapshots.refreshCloudflare,
  {}
);

crons.hourly(
  "github-snapshot",
  { minuteUTC: 27 },
  internal.snapshots.refreshGithub,
  {}
);

// Fleet HTTP probes — every 15 min, all apps with a URL.
crons.interval(
  "app-pings",
  { minutes: 15 },
  internal.pings.pingAllApps,
  {}
);

// Action Queue reconciler — every 10 min: sources ⇄ queue rows.
crons.interval(
  "queue-sync",
  { minutes: 10 },
  internal.brief.syncQueue,
  {}
);

// Morning brief — 00:00 UTC = 08:00 HKT push via ntfy.
crons.daily(
  "morning-brief",
  { hourUTC: 0, minuteUTC: 0 },
  internal.brief.sendMorningBrief,
  {}
);

export default crons;
