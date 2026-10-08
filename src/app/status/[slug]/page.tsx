import Link from "next/link";
import { CircleCheck, TriangleAlert, CircleX, CircleDashed } from "lucide-react";

// ─── Public client status page — /status/:slug ─────────────────────
// Branded, no-auth, honest. Reads the same probe data as Fleet via
// the publicStatus:getPage query. Segment config: (slug) without layout
// so it renders standalone (own centered container).

export const dynamic = "force-dynamic";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://quiet-kudu-739.convex.cloud";

type PageData = {
  brandName: string;
  logoUrl: string | null;
  accentColor: string | null;
  tagline: string | null;
  overall: "operational" | "degraded" | "outage";
  apps: {
    name: string;
    description: string | null;
    url: string | null;
    status: string;
    statusLabel: string;
    uptime30d: number | null;
    bars: { day: string; color: string; tip: string }[];
    lastMs: number | null;
    lastOk: boolean | null;
    lastPingAt: number | null;
  }[];
  generatedAt: number;
};

const BAR_FILL: Record<string, string> = {
  ok: "#22C55E",
  amber: "#F59E0B",
  red: "#EF4444",
  grey: "#334155",
};

const OVERALL: Record<string, { label: string; cls: string; Icon: typeof CircleCheck }> = {
  operational: { label: "All systems operational", cls: "text-[#22C55E]", Icon: CircleCheck },
  degraded: { label: "Degraded performance", cls: "text-[#F59E0B]", Icon: TriangleAlert },
  outage: { label: "Service disruption", cls: "text-[#EF4444]", Icon: CircleX },
};

function timeAgo(ts: number | null) {
  if (!ts) return "";
  const m = Math.floor((Date.now() - ts) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

async function getPage(slug: string): Promise<PageData | null> {
  try {
    const res = await fetch(`${CONVEX_URL}/api/query`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        path: "publicStatus:getPage",
        args: { slug },
        format: "json",
      }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.value ?? null) as PageData | null;
  } catch {
    return null;
  }
}

export default async function PublicStatusPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getPage(slug);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B1220] px-4">
        <div className="text-center">
          <CircleDashed className="mx-auto h-8 w-8 text-muted-foreground" />
          <h1 className="mt-3 text-lg font-semibold text-foreground">Status page not found</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            No published status page for &quot;{slug}&quot;.
          </p>
          <Link href="/" className="mt-4 inline-block text-sm text-primary hover:underline">
            ← Back to Oookea Space
          </Link>
        </div>
      </div>
    );
  }

  const accent = data.accentColor || "#6366F1";
  const overall = OVERALL[data.overall] ?? OVERALL.operational;

  return (
    <div className="min-h-screen bg-[#0B1220] px-4 py-10 text-foreground">
      <div className="mx-auto max-w-2xl">
        {/* Brand header */}
        <header className="flex items-center gap-3">
          {data.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.logoUrl} alt="" className="h-9 w-9 rounded-lg object-contain" />
          )}
          <div>
            <h1 className="text-xl font-bold" style={data.accentColor ? { color: accent } : undefined}>
              {data.brandName}
            </h1>
            {data.tagline && <p className="text-xs text-muted-foreground">{data.tagline}</p>}
          </div>
        </header>

        {/* Overall banner */}
        <section
          className="mt-6 flex items-center gap-3 rounded-xl border p-4"
          style={{ borderColor: `${accent}33`, background: `${accent}0d` }}
        >
          <overall.Icon className={`h-5 w-5 ${overall.cls}`} />
          <div>
            <p className={`text-sm font-semibold ${overall.cls}`}>{overall.label}</p>
            <p className="text-xs text-muted-foreground">
              Updated {timeAgo(data.generatedAt) || "just now"} · probes every 15 minutes
            </p>
          </div>
        </section>

        {/* Per-app rows */}
        <section className="mt-6 space-y-3">
          {data.apps.map((app) => (
            <div key={app.name} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {app.url ? (
                      <a href={app.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {app.name}
                      </a>
                    ) : (
                      app.name
                    )}
                  </p>
                  {app.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{app.description}</p>
                  )}
                </div>
                <span
                  className={`flex shrink-0 items-center gap-1.5 text-xs font-medium ${
                    app.status === "ok"
                      ? "text-[#22C55E]"
                      : app.status === "issue"
                        ? "text-[#F59E0B]"
                        : app.status === "offline"
                          ? "text-[#EF4444]"
                          : "text-muted-foreground"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      app.status === "ok"
                        ? "bg-[#22C55E]"
                        : app.status === "issue"
                          ? "bg-[#F59E0B]"
                          : app.status === "offline"
                            ? "bg-[#EF4444]"
                            : "bg-[#64748B]"
                    }`}
                  />
                  {app.statusLabel}
                </span>
              </div>

              {/* 30-day bars */}
              <div className="mt-3 flex h-5 items-end gap-[2px]">
                {app.bars.map((b, i) => (
                  <span
                    key={i}
                    title={b.tip}
                    className="h-full flex-1 rounded-[1px] opacity-80 hover:opacity-100"
                    style={{ background: BAR_FILL[b.color] ?? BAR_FILL.grey }}
                  />
                ))}
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground/70">
                <span>Last 30 days</span>
                <span>
                  {app.uptime30d !== null
                    ? `${app.uptime30d.toFixed(app.uptime30d >= 99 ? 1 : 2)}% uptime`
                    : "no data yet"}
                  {app.lastOk !== null && app.lastPingAt
                    ? ` · ${app.lastOk ? `${app.lastMs} ms` : "probe failed"} · ${timeAgo(app.lastPingAt)}`
                    : ""}
                </span>
              </div>
            </div>
          ))}
        </section>

        <footer className="mt-8 text-center text-[11px] text-muted-foreground/50">
          Powered by{" "}
          <Link href="https://space.oookea.com" className="hover:underline">
            Oookea Space Mission Control
          </Link>
        </footer>
      </div>
    </div>
  );
}
