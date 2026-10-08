"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { useSessionToken } from "@/lib/use-session-token";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { api } from "../../../../../convex/_generated/api";

// ─── Fleet — the Launchpad of everything E runs ───────────────────
// Live health per app: statusOverride > linked heartbeat > linked
// Vercel project's latest production deploy > ok. Fully real data —
// the same Vercel snapshot that feeds the Mission Control events.

type AppCategory = "client" | "product" | "internal" | "infra" | "trading";
type DerivedStatus = "ok" | "issue" | "offline" | "planned" | "waiting";

const CATEGORY_META: Record<
  AppCategory,
  { label: string; icon: typeof Rocket }
> = {
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

export default function FleetPage() {
  const { user } = useAuth();
  const router = useRouter();
  const token = useSessionToken();

  const apps = useQuery(api.apps.listApps, token ? { token } : "skip");
  const heartbeats = useQuery(api.heartbeats.listHeartbeats, token ? { token } : "skip");
  const vercelSnap = useQuery(api.snapshots.latestVercelSnapshot, token ? { token } : "skip");

  const [filter, setFilter] = useState<"all" | AppCategory>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  // Map vercel project name → deploy state from the latest snapshot
  const vercelStates = useMemo(() => {
    const map = new Map<string, string>();
    const projects = (vercelSnap?.payload as { projects?: { name: string; state: string }[] })
      ?.projects;
    for (const p of projects ?? []) map.set(p.name, p.state);
    return map;
  }, [vercelSnap]);

  // Map heartbeat name → live status
  const hbStatus = useMemo(() => {
    const map = new Map<string, string>();
    for (const hb of heartbeats ?? []) map.set(hb.name, hb.status);
    return map;
  }, [heartbeats]);

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

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                <LayoutGrid className="h-6 w-6 text-primary" />
                Fleet
              </h1>
              <p className="mt-1 text-muted-foreground">
                Every app, project and machine — live status at a glance.
                {snapAge && (
                  <span className="ml-1 text-muted-foreground/60">
                    Vercel snapshot {snapAge}.
                  </span>
                )}
              </p>
            </div>

            {/* Summary chips + search */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search the fleet…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Category filters */}
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

          {/* Grids by category */}
          {apps === undefined && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="h-36 animate-pulse rounded-xl border bg-muted/30" />
              ))}
            </div>
          )}

          {apps !== undefined && filtered.length === 0 && (
            <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
              Nothing matches &quot;{search}&quot;.
            </div>
          )}

          {grouped.map(([cat, list]) => {
            const Icon = CATEGORY_META[cat].icon;
            return (
              <section key={cat} className="space-y-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <Icon className="h-4 w-4" />
                  {CATEGORY_META[cat].label}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {list.map((app) => {
                    const status = derive(app);
                    const AppIcon = ICONS[app.icon ?? ""] ?? (app.category === "trading" ? LineChart : Compass);
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
                              <img
                                src={app.iconUrl}
                                alt=""
                                className="h-full w-full object-contain"
                                loading="lazy"
                              />
                            ) : (
                              <AppIcon className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[status]} ${
                              status === "offline" ? "animate-pulse" : ""
                            }`}
                            title={STATUS_LABEL[status]}
                          />
                        </div>
                        <div className="mt-3 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {app.name}
                            </p>
                            {app.pinned && (
                              <span className="rounded bg-primary/10 px-1 text-[10px] font-bold text-primary">
                                ★
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                            {app.description ?? STATUS_LABEL[status]}
                          </p>
                          {app.statusNote && (
                            <p className="mt-1 text-[11px] text-muted-foreground/70">
                              {app.statusNote}
                            </p>
                          )}
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
                          {app.repoUrl && (
                            <span className="ml-auto flex items-center gap-1">
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
                      "group flex h-full flex-col rounded-xl border bg-card p-4 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md";
                    return app.url ? (
                      <a
                        key={app._id}
                        href={app.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cls}
                      >
                        {Inner}
                      </a>
                    ) : (
                      <div key={app._id} className={cls}>
                        {Inner}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
