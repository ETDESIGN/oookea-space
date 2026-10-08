import type { Doc } from "../../../../../convex/_generated/dataModel";

// ─── Fleet shared bits (page + drawer) ─────────────────────────────

export type AppCategory = "client" | "product" | "internal" | "infra" | "trading";
export type DerivedStatus = "ok" | "issue" | "offline" | "planned" | "waiting";

export const CATEGORY_META: Record<AppCategory, { label: string; icon: string }> = {
  client: { label: "Client Projects", icon: "Wrench" },
  product: { label: "Products", icon: "Rocket" },
  internal: { label: "Internal", icon: "Factory" },
  infra: { label: "Infrastructure", icon: "Bot" },
  trading: { label: "Trading", icon: "LineChart" },
};

export const STATUS_DOT: Record<string, string> = {
  ok: "bg-[#22C55E]",
  issue: "bg-[#F59E0B]",
  offline: "bg-[#EF4444]",
  planned: "bg-[#8B5CF6]",
  waiting: "bg-[#64748B]",
};

export const STATUS_LABEL: Record<string, string> = {
  ok: "Healthy",
  issue: "Deploy failing",
  offline: "Offline",
  planned: "Planned",
  waiting: "No signal yet",
};

export const BAR_COLORS: Record<string, string> = {
  ok: "bg-[#22C55E]",
  amber: "bg-[#F59E0B]",
  red: "bg-[#EF4444]",
  grey: "bg-[#334155]",
};

export type DailyCheck = { day: string; pings: number; fails: number };

export function buildBars(checks: DailyCheck[], days = 30) {
  const byDay = new Map(checks.map((c) => [c.day, c]));
  const bars: { day: string; color: string; tip: string }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    const c = byDay.get(d);
    if (!c || c.pings === 0) {
      bars.push({ day: d, color: BAR_COLORS.grey, tip: `${d} · no data` });
    } else {
      const up = 1 - c.fails / c.pings;
      const color = up >= 0.99 ? BAR_COLORS.ok : up >= 0.95 ? BAR_COLORS.amber : BAR_COLORS.red;
      bars.push({ day: d, color, tip: `${d} · ${Math.round(up * 100)}% · ${c.pings} checks` });
    }
  }
  return bars;
}

export function uptimePctOf(checks: DailyCheck[]): number | null {
  if (!checks || checks.length === 0) return null;
  const pings = checks.reduce((s, r) => s + r.pings, 0);
  const fails = checks.reduce((s, r) => s + r.fails, 0);
  if (!pings) return null;
  return Math.max(0, (1 - fails / pings) * 100);
}

export function timeAgo(ts?: number) {
  if (!ts) return "";
  const m = Math.floor((Date.now() - ts) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export type DeriveInput = {
  statusOverride?: string;
  heartbeatName?: string;
  vercelProject?: string;
};

export function deriveStatus(
  app: DeriveInput,
  hbStatus: Map<string, string>,
  vercelStates: Map<string, string>
): DerivedStatus {
  if (app.statusOverride) return app.statusOverride as DerivedStatus;
  if (app.heartbeatName) {
    const s = hbStatus.get(app.heartbeatName);
    if (s === "ok") return "ok";
    if (s === "missed") return "offline";
    return "waiting";
  }
  if (app.vercelProject) {
    const st = vercelStates.get(app.vercelProject);
    if (st === "ERROR") return "issue";
    if (st === "READY") return "ok";
    if (!st) return "waiting";
    return "ok";
  }
  return "ok";
}

export type AppDoc = Doc<"apps">;
