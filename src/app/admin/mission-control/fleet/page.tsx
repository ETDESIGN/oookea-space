"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useAction } from "convex/react";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { useSessionToken } from "@/lib/use-session-token";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LayoutGrid,
  Search,
  Rocket,
  Wrench,
  Factory,
  Bot,
  LineChart,
  CircleCheck,
  TriangleAlert,
  ArrowUpRight,
  GitBranch,
  Compass,
  Activity,
  Radar,
} from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import { Doc } from "../../../../../convex/_generated/dataModel";
import { FleetDrawer } from "./fleet-drawer";
import { Sparkline } from "./sparkline";

// ─── Fleet — the Launchpad of everything E runs ───────────────────
// v2 (research-driven upgrade):
// - Real HTTP probes every 15 min → latency badge + honest uptime bars
// - 30-day per-day status strip per app (green/amber/red/grey, tooltips)
// - Attention-first: failing/offline apps surface at the top
// - Never color alone: every dot has a text label
// Health derivation: probe > statusOverride > linked heartbeat >
// linked Vercel project deploy state > ok.

type AppCategory = "client" | "product" | "internal" | "infra" | "trading";
type DerivedStatus = "ok" | "issue" | "offline" | "planned" | "waiting";

const CATEGORY_META: Record<AppCategory, { label: string; icon: typeof Rocket }> = {
  client: { label: "Client Projects", icon: Wrench },
  product: { label: "Products", icon: Rocket },
  internal: { label: "Internal", icon: Factory },
  infra: { label: "Infrastructure", icon: Bot },
  trading: { label: "Trading", icon: LineChart },
};

const STATUS_DOT: Record<string, string> = {
  ok: "bg-[#22C55E]",
  issue: "bg-[#F59E0B]",
  offline: "bg-[#EF4444]",
  planned: "bg-[#8B5CF6]",
  waiting: "bg-[#64748B]",
};

const STATUS_LABEL: Record<string, string> = {
  ok: "Healthy",
  issue: "Deploy failing",
  offline: "Offline",
  planned: "Planned",
  waiting: "No signal yet",
};

const BAR_COLORS: Record<string, string> = {
  ok: "bg-[#22C55E]",
  amber: "bg-[#F59E0B]",
  red: "bg-[#EF4444]",
  grey: "bg-[#334155]",
};

const ICONS: Record<string, typeof Rocket> = {
  rocket: Rocket,
  wrench: Wrench,
  factory: Factory,
  bot: Bot,
  chart: LineChart,
  grid: LayoutGrid,
  compass: Compass,
};

function timeAgo(ts?: number) {
  if (!ts) return "";
  const m = Math.floor((Date.now() - ts) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** 30-day strip data for one app from daily rollups. */
function buildBars(checks: { day: string; pings: number; fails: number }[], days = 30) {
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
      bars.push({
        day: d,
        color,
        tip: `${d} · ${Math.round(up * 100)}% · ${c.pings} checks`,
      });
    }
  }
  return bars;
}

export default function FleetPage() {
  const { user } = useAuth();
  const router = useRouter();
  const token = useSessionToken();

  const apps = useQuery(api.apps.listApps, token ? { token } : "skip");
  const heartbeats = useQuery(api.heartbeats.listHeartbeats, token ? { token } : "skip");
  const vercelSnap = useQuery(api.snapshots.latestVercelSnapshot, token ? { token } : "skip");
  const checks = useQuery(api.pings.recentChecks, token ? { token, days: 30 } : "skip");

  const requestPingAll = useAction(api.pings.requestPingAll);
  const [pinging, setPinging] = useState(false);
  const [pingNote, setPingNote] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const [filter, setFilter] = useState<"all" | AppCategory>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedApp = useMemo(
    () => (apps ?? []).find((a) => a._id === selectedId) ?? null,
    [apps, selectedId]
  );

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const vercelStates = useMemo(() => {
    const map = new Map<string, string>();
    const projects = (vercelSnap?.payload as { projects?: { name: string; state: string }[] })
      ?.projects;
    for (const p of projects ?? []) map.set(p.name, p.state);
    return map;
  }, [vercelSnap]);

  const hbStatus = useMemo(() => {
    const map = new Map<string, string>();
    for (const hb of heartbeats ?? []) map.set(hb.name, hb.status);
    return map;
  }, [heartbeats]);

  const checksByApp = useMemo(() => {
    const map = new Map<string, { day: string; pings: number; fails: number }[]>();
    for (const c of checks ?? []) {
      const key = c.appId as unknown as string;
      const arr = map.get(key) ?? [];
      arr.push(c);
      map.set(key, arr);
    }
    return map;
  }, [checks]);

  const derive = (app: {
    statusOverride?: string;
    heartbeatName?: string;
    vercelProject?: string;
  }): DerivedStatus => {
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
  };

  const uptimePct = (appId: string): number | null => {
    const rows = checksByApp.get(appId);
    if (!rows || rows.length === 0) return null;
    const pings = rows.reduce((s, r) => s + r.pings, 0);
    const fails = rows.reduce((s, r) => s + r.fails, 0);
    if (!pings) return null;
    return Math.max(0, (1 - fails / pings) * 100);
  };

  const doPingAll = async () => {
    setPinging(true);
    setPingNote(null);
    try {
      const r = await requestPingAll({ token });
      setPingNote(
        `${r.probed} probed · ${r.up} up · ${r.down} down · ${r.flips} flip${r.flips === 1 ? "" : "s"}${
          r.worst.length ? ` — down: ${r.worst.map((w) => w.name).join(", ")}` : ""
        }`
      );
      startTransition(() => undefined);
    } catch {
      setPingNote("ping failed — try again");
    } finally {
      setPinging(false);
      setTimeout(() => setPingNote(null), 8000);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (apps ?? []).filter((a) => {
      if (filter !== "all" && a.category !== filter) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        (a.description ?? "").toLowerCase().includes(q) ||
        (a.vercelProject ?? "").toLowerCase().includes(q)
      );
    });
  }, [apps, filter, search]);

  const counts = useMemo(() => {
    const c = { ok: 0, issue: 0, offline: 0, planned: 0, waiting: 0 };
    for (const a of apps ?? []) c[derive(a)]++;
    return c;
  }, [apps, vercelStates, hbStatus]);

  const grouped = useMemo(() => {
    const g = new Map<AppCategory, typeof filtered>();
    for (const a of filtered) {
      const arr = g.get(a.category) ?? [];
      arr.push(a);
      g.set(a.category, arr);
    }
    return [...g.entries()].sort(
      (x, y) => CATEGORY_META[x[0]].label.localeCompare(CATEGORY_META[y[0]].label)
    );
  }, [filtered, vercelStates, hbStatus]);

  const attention = useMemo(() => {
    if (search.trim() || filter !== "all" || apps === undefined) return [];
    return apps
      .filter((a) => ["issue", "offline"].includes(derive(a)))
      .sort((a, b) => a.order - b.order);
  }, [apps, search, filter, vercelStates, hbStatus]);

  if (!user || user.role !== "admin") {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  const snapAge = timeAgo(vercelSnap?.createdAt);

  const renderCard = (app: Doc<"apps">) => {
    const status = derive(app);
    const AppIcon = ICONS[app.icon ?? ""] ?? (app.category === "trading" ? LineChart : Compass);
    const bars = buildBars(checksByApp.get(app._id as unknown as string) ?? []);
    const up = uptimePct(app._id as unknown as string);
    const Inner = (
      <>
        <div className="flex items-start justify-between">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl border bg-background ${
              app.iconUrl ? "p-1.5" : ""
            }`}
          >
            {app.iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={app.iconUrl} alt="" className="h-full w-full object-contain" loading="lazy" />
            ) : (
              <AppIcon className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {/* Latency badge from real probes */}
            {app.lastPingAt !== undefined &&
              (app.lastOk ? (
                <Badge
                  variant="secondary"
                  className="h-5 border-0 bg-[#22C55E]/10 px-1.5 text-[10px] font-medium text-[#22C55E]"
                >
                  {app.lastMs} ms
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  className="h-5 border-0 bg-[#EF4444]/10 px-1.5 text-[10px] font-medium text-[#EF4444]"
                >
                  {app.lastStatusCode === 0 ? "timeout" : `HTTP ${app.lastStatusCode}`}
                </Badge>
              ))}
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[status]} ${
                status === "offline" ? "animate-pulse" : ""
              }`}
            />
          </div>
        </div>
        <div className="mt-3 min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-foreground">{app.name}</p>
            {app.pinned && (
              <span className="rounded bg-primary/10 px-1 text-[10px] font-bold text-primary">★</span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {app.description ?? STATUS_LABEL[status]}
          </p>
          {app.statusNote && (
            <p className="mt-1 text-[11px] text-muted-foreground/70">{app.statusNote}</p>
          )}
        </div>

        {/* Latency sparkline (last 48 probes) */}
        {app.latencyHistory && app.latencyHistory.length > 3 && (
          <div className="mt-2">
            <Sparkline
              points={app.latencyHistory.map((h) => ({ t: h.t, v: h.ms, ok: h.ok }))}
            />
          </div>
        )}

        {/* 30-day uptime strip (honest greys for no data) */}
        <div className="mt-3 flex h-4 items-end gap-[2px]" aria-hidden="true">
          {bars.map((b, i) => (
            <span
              key={i}
              title={b.tip}
              className={`h-full flex-1 rounded-[1px] ${b.color} opacity-80 transition-opacity hover:opacity-100`}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground/70">
          <span className="flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
            {STATUS_LABEL[status]}
          </span>
          <span>
            {up !== null
              ? `${up.toFixed(up >= 99 ? 1 : 2)}% · 30d`
              : app.lastPingAt
                ? "first day"
                : "no checks yet"}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground/60">
          {app.vercelProject && (
            <span className="flex items-center gap-1">
              <TriangleAlert className="h-3 w-3" /> vercel
            </span>
          )}
          {app.heartbeatName && (
            <span className="flex items-center gap-1">
              <CircleCheck className="h-3 w-3" /> heartbeat
            </span>
          )}
          {app.lastPingAt ? (
            <span className="flex items-center gap-1">
              <Radar className="h-3 w-3" /> pinged {timeAgo(app.lastPingAt)}
            </span>
          ) : null}
          {app.repoUrl && !(app.vercelProject || app.lastPingAt) && (
            <span className="flex items-center gap-1">
              <GitBranch className="h-3 w-3" /> repo
            </span>
          )}
          {app.url && (
            <span className="ml-auto flex items-center gap-0.5">
              open <ArrowUpRight className="h-3 w-3" />
            </span>
          )}
        </div>
      </>
    );
    const cls =
      "group flex h-full cursor-pointer flex-col rounded-xl border bg-card p-4 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md";
    return (
      <button key={app._id} className={cls} onClick={() => setSelectedId(app._id)}>
        {Inner}
      </button>
    );
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                  <LayoutGrid className="h-6 w-6 text-primary" />
                  Fleet
                </h1>
                <p className="mt-1 text-muted-foreground">
                  Every app, project and machine — live status at a glance.
                  {snapAge && (
                    <span className="ml-1 text-muted-foreground/60">Vercel snapshot {snapAge}.</span>
                  )}
                </p>
              </div>
              <div className="flex flex-col items-start gap-1.5 sm:items-end">
                <Button size="sm" variant="outline" onClick={doPingAll} disabled={pinging}>
                  <Activity className={`mr-1.5 h-3.5 w-3.5 ${pinging ? "animate-pulse" : ""}`} />
                  {pinging ? "Pinging everything…" : "Ping all now"}
                </Button>
                {pingNote && (
                  <span className="max-w-xs text-right text-xs text-muted-foreground">{pingNote}</span>
                )}
              </div>
            </div>

            {/* Summary chips */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1.5 border-0 bg-[#22C55E]/10 text-[#22C55E]">
                <span className="h-2 w-2 rounded-full bg-[#22C55E]" /> {counts.ok} healthy
              </Badge>
              {counts.issue > 0 && (
                <Badge variant="secondary" className="gap-1.5 border-0 bg-[#F59E0B]/10 text-[#F59E0B]">
                  <span className="h-2 w-2 rounded-full bg-[#F59E0B]" /> {counts.issue} failing
                </Badge>
              )}
              {counts.offline > 0 && (
                <Badge variant="secondary" className="gap-1.5 border-0 bg-[#EF4444]/10 text-[#EF4444]">
                  <span className="h-2 w-2 rounded-full bg-[#EF4444]" /> {counts.offline} offline
                </Badge>
              )}
              {counts.waiting > 0 && (
                <Badge variant="secondary" className="gap-1.5 border-0 bg-muted text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-[#64748B]" /> {counts.waiting} no signal
                </Badge>
              )}
              {counts.planned > 0 && (
                <Badge variant="secondary" className="gap-1.5 border-0 bg-[#8B5CF6]/10 text-[#8B5CF6]">
                  <span className="h-2 w-2 rounded-full bg-[#8B5CF6]" /> {counts.planned} planned
                </Badge>
              )}
            </div>

            {/* Search + category filters */}
            <div className="flex flex-col gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search the fleet…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilter("all")}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    filter === "all"
                      ? "border-primary bg-primary text-white"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All ({(apps ?? []).length})
                </button>
                {(Object.keys(CATEGORY_META) as AppCategory[]).map((cat) => {
                  const n = (apps ?? []).filter((a) => a.category === cat).length;
                  if (!n) return null;
                  const Icon = CATEGORY_META[cat].icon;
                  return (
                    <button
                      key={cat}
                      onClick={() => setFilter(cat)}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        filter === cat
                          ? "border-primary bg-primary text-white"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {CATEGORY_META[cat].label} ({n})
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Loading */}
          {apps === undefined && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="h-44 animate-pulse rounded-xl border bg-muted/30" />
              ))}
            </div>
          )}

          {apps !== undefined && filtered.length === 0 && (
            <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
              Nothing matches &quot;{search}&quot;.
            </div>
          )}

          {/* Attention-first strip */}
          {attention.length > 0 && (
            <section className="rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/5 p-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[#F59E0B]">
                <TriangleAlert className="h-4 w-4" />
                Needs your attention ({attention.length})
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {attention.map((a) => {
                  const status = derive(a);
                  return (
                    <a
                      key={a._id}
                      href={a.url ?? (a.repoUrl || "#")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-[#F59E0B]/60"
                    >
                      <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
                      {a.name}
                      <span className="text-muted-foreground">
                        {a.statusNote ?? STATUS_LABEL[status]}
                      </span>
                    </a>
                  );
                })}
              </div>
            </section>
          )}

          {/* Grids by category */}
          {grouped.map(([cat, list]) => {
            const Icon = CATEGORY_META[cat].icon;
            return (
              <section key={cat} className="space-y-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <Icon className="h-4 w-4" />
                  {CATEGORY_META[cat].label}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {list.map(renderCard)}
                </div>
              </section>
            );
          })}

          {/* Provenance footnote */}
          <p className="pt-2 text-center text-[11px] text-muted-foreground/50">
            Health = HTTP probe (15 min) · deploy state (Vercel, hourly) · heartbeat (push) ·
            manual override. Uptime window: last 30 days of probes.
          </p>
        </div>
      </AppLayout>
      <FleetDrawer
        app={selectedApp}
        status={selectedApp ? derive(selectedApp) : "ok"}
        checks={selectedApp ? checksByApp.get(selectedApp._id as unknown as string) ?? [] : []}
        onClose={() => setSelectedId(null)}
      />
    </ProtectedRoute>
  );
}
