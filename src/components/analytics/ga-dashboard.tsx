"use client";

/**
 * Analytics module dashboard — left rail lists the client's sites (from the
 * module config, e.g. caneles.hk), the main pane shows live GA4 data pulled
 * through /api/ga (session-scoped). Hand-rolled SVG charts, no chart deps.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, TrendingUp, Users, Eye, ShoppingBag, DollarSign } from "lucide-react";

export interface GaSiteConfig {
  label: string;
  property: string;
  accent?: string;
}

interface GaModuleConfig {
  type?: string;
  sites?: GaSiteConfig[];
}

interface Report {
  property: string;
  days: number;
  daily: Array<{ date: string; sessions: number; users: number; views: number; revenue: number }>;
  purchases: Array<{ dim: string; val: number }>;
  pages: Array<{ path: string; views: number; sessions: number }>;
  channels: Array<{ channel: string; sessions: number }>;
  devices: Array<{ device: string; sessions: number }>;
}

const RANGES = [7, 28, 90] as const;

function fmtDate(yyyymmdd: string): string {
  const m = Number(yyyymmdd.slice(4, 6)), d = Number(yyyymmdd.slice(6, 8));
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${names[m - 1]}`;
}

function fmtNum(n: number): string {
  return n.toLocaleString("en-HK");
}

function fmtHkd(dollars: number): string {
  // GA4 purchaseRevenue comes back in the property currency (HKD) as dollars.
  const v = Math.round(dollars * 100) / 100;
  return "HK$" + v.toLocaleString("en-HK", { maximumFractionDigits: v % 1 === 0 ? 0 : 2 });
}

/* ── Minimal SVG area chart: 1-2 series, value labels on hover-less build ── */
function AreaChart({
  series,
  labels,
  height = 180,
}: {
  series: Array<{ name: string; color: string; points: number[] }>;
  labels: string[];
  height?: number;
}) {
  const W = 720, H = height, PL = 8, PR = 8, PT = 12, PB = 22;
  const n = Math.max(labels.length, 2);
  const max = Math.max(1, ...series.flatMap((s) => s.points));
  const x = (i: number) => PL + (i / (n - 1)) * (W - PL - PR);
  const y = (v: number) => PT + (1 - v / max) * (H - PT - PB);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Traffic chart">
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <line key={t} x1={PL} x2={W - PR} y1={y(max * t)} y2={y(max * t)} stroke="currentColor" className="text-border" strokeWidth="1" strokeDasharray={t === 1 ? "0" : "3 4"} />
      ))}
      {series.map((s) => {
        const pts = s.points.map((v, i) => `${x(i)},${y(v)}`).join(" ");
        const area = `${PL},${y(0)} ${pts} ${x(s.points.length - 1)},${y(0)}`;
        return (
          <g key={s.name}>
            <polygon points={area} fill={s.color} opacity="0.08" />
            <polyline points={pts} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={x(s.points.length - 1)} cy={y(s.points[s.points.length - 1] ?? 0)} r="3.5" fill={s.color} />
          </g>
        );
      })}
      {labels.map((l, i) => {
        const every = Math.ceil(labels.length / 7);
        if (i % every !== 0 && i !== labels.length - 1) return null;
        return (
          <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} className="fill-muted-foreground" fontSize="11">
            {l}
          </text>
        );
      })}
    </svg>
  );
}

/* ── Horizontal bars (channels / devices) ── */
function BarList({ rows, accent }: { rows: Array<{ label: string; value: number }>; accent: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1 flex items-baseline justify-between text-sm">
            <span className="text-foreground">{r.label}</span>
            <span className="tabular-nums text-muted-foreground">{fmtNum(r.value)}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: accent }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function GaDashboard({ module: mod }: { module: { config?: GaModuleConfig; title?: string } & Record<string, unknown> }) {
  const sites: GaSiteConfig[] = (mod.config?.sites ?? []).filter(Boolean);
  const [activeSite, setActiveSite] = useState(0);
  const [days, setDays] = useState<number>(28);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const site = sites[Math.min(activeSite, sites.length - 1)];
  const accent = site?.accent || "var(--primary)";

  const load = useCallback(async () => {
    if (!site) return;
    setLoading(true);
    setError(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("oookea_session") || "" : "";
      const res = await fetch("/api/ga", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, propertyId: site.property, days }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `request failed (${res.status})`);
      setReport(data as Report);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, [site?.property, days]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    const d = report?.daily ?? [];
    return {
      sessions: d.reduce((s, x) => s + x.sessions, 0),
      users: d.reduce((s, x) => s + x.users, 0),
      views: d.reduce((s, x) => s + x.views, 0),
      revenue: d.reduce((s, x) => s + x.revenue, 0),
      purchases: (report?.purchases ?? []).reduce((s, x) => s + x.val, 0),
    };
  }, [report]);

  if (!sites.length) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
        No sites configured for this module yet.
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      {/* Left rail — sites (the client's websites, step-by-step) */}
      <aside className="space-y-2">
        <p className="px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Websites</p>
        {sites.map((s, i) => (
          <button
            key={s.property}
            onClick={() => setActiveSite(i)}
            className={`flex w-full items-center gap-3 rounded-lg border px-3.5 py-3 text-left text-sm transition-colors ${
              i === activeSite
                ? "border-primary/40 bg-primary/5 font-medium text-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.accent || "var(--primary)" }} />
            {s.label}
          </button>
        ))}
        <div className="rounded-lg border border-dashed border-border px-3.5 py-3 text-xs text-muted-foreground">
          More tools are added here step by step — ask Oookea.
        </div>
      </aside>

      {/* Main pane */}
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">{site.label}</h1>
            <p className="text-sm text-muted-foreground">Live analytics — visitors, traffic and sales</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border bg-card p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setDays(r)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    days === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r}d
                </button>
              ))}
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {loading && !report ? (
          <div className="flex items-center justify-center rounded-xl border border-border bg-card py-24">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            Couldn&apos;t load analytics: {error}
          </div>
        ) : report ? (
          <>
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
              <Kpi icon={Users} label="Visitors" value={fmtNum(totals.users)} sub="unique users" />
              <Kpi icon={TrendingUp} label="Sessions" value={fmtNum(totals.sessions)} sub={`last ${report.days} days`} />
              <Kpi icon={Eye} label="Page views" value={fmtNum(totals.views)} />
              <Kpi icon={ShoppingBag} label="Orders" value={fmtNum(totals.purchases)} sub="completed checkouts" />
              <Kpi icon={DollarSign} label="Revenue" value={fmtHkd(totals.revenue)} sub="excl. delivery fees" />
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-4">
                <h2 className="text-sm font-semibold text-foreground">Traffic</h2>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: accent }} />Sessions</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted-foreground/60" />Page views</span>
                </div>
              </div>
              <AreaChart
                labels={report.daily.map((d) => fmtDate(d.date))}
                series={[
                  { name: "views", color: "var(--muted-foreground)", points: report.daily.map((d) => d.views) },
                  { name: "sessions", color: accent, points: report.daily.map((d) => d.sessions) },
                ]}
              />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold text-foreground">Top pages</h2>
                <table className="w-full text-sm">
                  <tbody>
                    {report.pages.map((p) => (
                      <tr key={p.path} className="border-b border-border/60 last:border-0">
                        <td className="py-2 pr-3 text-foreground">{p.path}</td>
                        <td className="py-2 text-right tabular-nums text-muted-foreground">{fmtNum(p.views)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-5">
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <h2 className="mb-3 text-sm font-semibold text-foreground">Where visitors come from</h2>
                  <BarList rows={report.channels.map((c) => ({ label: c.channel, value: c.sessions }))} accent={accent} />
                </div>
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <h2 className="mb-3 text-sm font-semibold text-foreground">Devices</h2>
                  <BarList rows={report.devices.map((d) => ({ label: d.device, value: d.sessions }))} accent={accent} />
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
