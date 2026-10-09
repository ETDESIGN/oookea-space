"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { useSessionToken } from "@/lib/use-session-token";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Activity,
  TriangleAlert,
  CircleCheck,
  CircleX,
  RefreshCw,
  Copy,
  Plus,
  Trash2,
  Server,
  Cloud,
  Globe,
  GitBranch,
  Zap,
  Power,
} from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import {
  Inbox,
  Send,
  BellOff,
} from "lucide-react";

// ─── Mission Control — Round 2 v1 ────────────────────────────────
// Tile grid: integrations (provider health) + heartbeats (cron
// dead-man's-switch) + the live events feed. Push-first: Netlify/
// GitHub/Stripe POST to /api/webhook/:provider; crons GET
// /api/heartbeat/:token. Sync-now + fallback sweeps cover the rest.

type IntegrationStatus = "ok" | "setup" | "error" | "unknown";

const PROVIDER_META: Record<
  string,
  { icon: typeof Server; label: string }
> = {
  vercel: { icon: TriangleAlert, label: "Vercel" },
  netlify: { icon: Server, label: "Netlify" },
  cloudflare: { icon: Cloud, label: "Cloudflare" },
  github: { icon: GitBranch, label: "GitHub" },
  stripe: { icon: Zap, label: "Stripe" },
};

const STATUS_STYLES: Record<
  string,
  { dot: string; text: string; chip: string; label: string }
> = {
  ok: {
    dot: "bg-[#22C55E]",
    text: "text-[#22C55E]",
    chip: "bg-[#22C55E]/10 text-[#22C55E]",
    label: "OK",
  },
  setup: {
    dot: "bg-[#F59E0B]",
    text: "text-[#F59E0B]",
    chip: "bg-[#F59E0B]/10 text-[#F59E0B]",
    label: "Setup",
  },
  error: {
    dot: "bg-[#EF4444]",
    text: "text-[#EF4444]",
    chip: "bg-[#EF4444]/10 text-[#EF4444]",
    label: "Error",
  },
  waiting: {
    dot: "bg-[#64748B]",
    text: "text-muted-foreground",
    chip: "bg-muted text-muted-foreground",
    label: "Waiting",
  },
  missed: {
    dot: "bg-[#EF4444]",
    text: "text-[#EF4444]",
    chip: "bg-[#EF4444]/10 text-[#EF4444]",
    label: "Missed",
  },
  paused: {
    dot: "bg-[#64748B]",
    text: "text-muted-foreground",
    chip: "bg-muted text-muted-foreground",
    label: "Paused",
  },
  unknown: {
    dot: "bg-[#94A3B8]",
    text: "text-muted-foreground",
    chip: "bg-muted text-muted-foreground",
    label: "Unknown",
  },
};

function statusOf(s: string) {
  return STATUS_STYLES[s] ?? STATUS_STYLES.unknown;
}

function timeAgo(ts?: number) {
  if (!ts) return "never";
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function MissionControlPage() {
  const { user } = useAuth();
  const router = useRouter();
  const token = useSessionToken();

  const integrations = useQuery(
    api.integrations.listIntegrations,
    token ? { token } : "skip"
  );
  const queue = useQuery(api.brief.listQueue, token ? { token } : "skip");
  const completeItem = useMutation(api.brief.completeItem);
  const snoozeItem = useMutation(api.brief.snoozeItem);
  const requestBrief = useAction(api.brief.requestBrief);
  const [briefing, setBriefing] = useState(false);
  const [briefNote, setBriefNote] = useState<string | null>(null);
  const heartbeats = useQuery(
    api.heartbeats.listHeartbeats,
    token ? { token } : "skip"
  );
  const events = useQuery(api.integrations.listEvents, token ? { token, limit: 20 } : "skip");

  const requestSync = useAction(api.integrations.requestSync);
  const upsertIntegration = useMutation(api.integrations.upsertIntegration);
  const addHeartbeat = useMutation(api.heartbeats.upsertHeartbeat);
  const toggleHeartbeat = useMutation(api.heartbeats.setHeartbeatEnabled);
  const removeHeartbeat = useMutation(api.heartbeats.removeHeartbeat);

  const [syncing, setSyncing] = useState<string | null>(null);
  const [newHbName, setNewHbName] = useState("");
  const [newHbMinutes, setNewHbMinutes] = useState("30");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const gated = !user || user.role !== "admin";

  const attention = useMemo(() => {
    const errs =
      (integrations ?? []).filter((i) => i.status === "error").length +
      (heartbeats ?? []).filter((h) => h.status === "missed").length;
    const setup =
      (integrations ?? []).filter((i) => i.status === "setup").length +
      (heartbeats ?? []).filter((h) => h.status === "waiting").length;
    return { errs, setup };
  }, [integrations, heartbeats]);

  const copy = (label: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  const doSync = async (provider: "vercel" | "netlify" | "cloudflare" | "github") => {
    setSyncing(provider);
    try {
      await requestSync({ token, provider });
    } finally {
      setSyncing(null);
    }
  };

  const genWebhookSecret = async (provider: string) => {
    const secret = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    await upsertIntegration({
      token,
      provider,
      name: PROVIDER_META[provider]?.label ?? provider,
      webhookSecret: secret,
    });
    copy(`secret-${provider}`, secret);
  };

  const addMonitor = async () => {
    const name = newHbName.trim();
    const mins = parseInt(newHbMinutes, 10);
    if (!name || !mins || mins < 1) return;
    await addHeartbeat({ token, name, expectedIntervalSec: mins * 60 });
    setNewHbName("");
    setNewHbMinutes("30");
  };

  if (gated) {
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

  const allGreen =
    attention.errs === 0 &&
    (integrations ?? []).length > 0 &&
    (heartbeats ?? []).every((h) => h.status !== "waiting");

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          {/* Header + global status strip */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                <Activity className="h-6 w-6 text-primary" />
                Mission Control
              </h1>
              <p className="mt-1 text-muted-foreground">
                Everything online, at a glance — deploys, domains, fleet.
              </p>
            </div>
            <div
              className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 ${
                attention.errs > 0
                  ? "border-[#EF4444]/30 bg-[#EF4444]/10"
                  : "border-[#22C55E]/30 bg-[#22C55E]/10"
              }`}
            >
              <span className="relative flex h-3 w-3">
                {!allGreen && (
                  <span
                    className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${
                      attention.errs > 0 ? "bg-[#EF4444]" : "bg-[#22C55E]"
                    }`}
                  />
                )}
                <span
                  className={`relative inline-flex h-3 w-3 rounded-full ${
                    attention.errs > 0 ? "bg-[#EF4444]" : "bg-[#22C55E]"
                  }`}
                />
              </span>
              <span className="text-sm font-medium text-foreground">
                {attention.errs > 0
                  ? `${attention.errs} need attention`
                  : allGreen
                    ? "All systems normal"
                    : "Nominal — finishing setup"}
              </span>
              {attention.setup > 0 && (
                <Badge variant="secondary" className="bg-[#F59E0B]/10 text-[#F59E0B]">
                  {attention.setup} pending setup
                </Badge>
              )}
            </div>
          </div>

          {/* Action Queue (R3a) — one dismissible list of everything needing E */}
          {queue !== undefined && (
            <section
              className={`rounded-xl border p-4 ${
                queue.length > 0
                  ? "border-[#F59E0B]/30 bg-[#F59E0B]/5"
                  : "border-[#22C55E]/30 bg-[#22C55E]/5"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <h2
                  className={`flex items-center gap-2 text-sm font-semibold uppercase tracking-wide ${
                    queue.length > 0 ? "text-[#F59E0B]" : "text-[#22C55E]"
                  }`}
                >
                  <Inbox className="h-4 w-4" />
                  Action Queue
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {queue.length}
                  </span>
                </h2>
                <button
                  className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                  disabled={briefing}
                  onClick={async () => {
                    setBriefing(true);
                    setBriefNote(null);
                    try {
                      const r = await requestBrief({ token });
                      setBriefNote(r.pushed ? "pushed to your phone ✓" : "push failed (ntfy unreachable)");
                    } catch {
                      setBriefNote("failed");
                    } finally {
                      setBriefing(false);
                      setTimeout(() => setBriefNote(null), 6000);
                    }
                  }}
                >
                  <Send className={`h-3 w-3 ${briefing ? "animate-pulse" : ""}`} />
                  Send brief now
                </button>
              </div>
              {briefNote && (
                <p className="mt-1 text-right text-[11px] text-muted-foreground">{briefNote}</p>
              )}
              {queue.length === 0 ? (
                <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <CircleCheck className="h-4 w-4 text-[#22C55E]" />
                  All clear — nothing needs you. The 8:00 brief will tell you if that changes.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {queue.map((item) => {
                    const sev =
                      item.severity === "critical"
                        ? { dot: "bg-[#EF4444]", text: "text-[#EF4444]" }
                        : item.severity === "warning"
                          ? { dot: "bg-[#F59E0B]", text: "text-[#F59E0B]" }
                          : { dot: "bg-[#64748B]", text: "text-muted-foreground" };
                    return (
                      <li
                        key={String(item._id)}
                        className="flex flex-col gap-2 rounded-lg border bg-background p-3 sm:flex-row sm:items-center"
                      >
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${sev.dot}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {item.actionUrl ? (
                              <a href={item.actionUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                {item.title}
                              </a>
                            ) : (
                              item.title
                            )}
                          </p>
                          {item.detail && (
                            <p className="text-xs text-muted-foreground">{item.detail}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            className="rounded-md border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                            onClick={() => snoozeItem({ token, id: item._id as never })}
                          >
                            <BellOff className="mr-1 inline h-3 w-3" />
                            4h
                          </button>
                          <button
                            className="rounded-md border border-[#22C55E]/40 bg-[#22C55E]/10 px-2.5 py-1 text-xs font-medium text-[#22C55E] transition-colors hover:bg-[#22C55E]/20"
                            onClick={() => completeItem({ token, id: item._id as never })}
                          >
                            <CircleCheck className="mr-1 inline h-3 w-3" />
                            Done
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}

          {/* Integrations */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Integrations
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {integrations === undefined && (
                <>
                  {[0, 1, 2].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="h-28" />
                    </Card>
                  ))}
                </>
              )}
              {(integrations ?? []).map((integ) => {
                const meta = PROVIDER_META[integ.provider];
                const Icon = meta?.icon ?? Globe;
                const st = statusOf(integ.status);
                const canSync = ["vercel", "netlify", "cloudflare", "github"].includes(
                  integ.provider
                );
                return (
                  <Card key={integ._id} className="flex flex-col">
                    <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {meta?.label ?? integ.name}
                      </CardTitle>
                      <span className={`flex items-center gap-1.5 text-xs font-medium ${st.text}`}>
                        <span className={`h-2 w-2 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col justify-between gap-3">
                      <div>
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {integ.detail ?? "No sync yet"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground/70">
                          Synced {timeAgo(integ.lastSyncAt)} · last event{" "}
                          {timeAgo(integ.lastEventAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {canSync && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={syncing === integ.provider}
                            onClick={() =>
                              doSync(integ.provider as "vercel" | "netlify" | "cloudflare" | "github")
                            }
                          >
                            <RefreshCw
                              className={`mr-1.5 h-3.5 w-3.5 ${syncing === integ.provider ? "animate-spin" : ""}`}
                            />
                            {syncing === integ.provider ? "Syncing…" : "Sync now"}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => genWebhookSecret(integ.provider)}
                        >
                          <Copy className="mr-1.5 h-3.5 w-3.5" />
                          {integ.webhookSecret ? "Rotate secret" : "Webhook secret"}
                        </Button>
                        {integ.webhookSecret && origin && (
                          <span className="w-full truncate text-xs text-muted-foreground/70">
                            POST {origin}/api/webhook/{integ.provider}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {integrations !== undefined && integrations.length === 0 && (
                <Card className="sm:col-span-2 xl:col-span-3">
                  <CardContent className="flex h-28 flex-col items-center justify-center gap-2 text-center">
                    <p className="text-sm text-muted-foreground">
                      No integrations yet — press &quot;Sync now&quot; on any provider below to
                      create them, or wait for the hourly sweep.
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => doSync("vercel")}>
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Vercel
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => doSync("cloudflare")}>
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Cloudflare
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => doSync("github")}>
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> GitHub
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </section>

          {/* Heartbeats */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Agent Heartbeats
            </h2>
            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="hb-name">Monitor name</Label>
                    <Input
                      id="hb-name"
                      placeholder="NEAR trading bot"
                      value={newHbName}
                      onChange={(e) => setNewHbName(e.target.value)}
                    />
                  </div>
                  <div className="w-full space-y-1.5 sm:w-40">
                    <Label htmlFor="hb-mins">Every (minutes)</Label>
                    <Input
                      id="hb-mins"
                      type="number"
                      min={1}
                      value={newHbMinutes}
                      onChange={(e) => setNewHbMinutes(e.target.value)}
                    />
                  </div>
                  <Button onClick={addMonitor} disabled={!newHbName.trim()}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add monitor
                  </Button>
                </div>

                <div className="space-y-2">
                  {(heartbeats ?? []).length === 0 && (
                    <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                      No monitors yet. Add one, then have the job ping the URL after each run.
                    </p>
                  )}
                  {(heartbeats ?? []).map((hb) => {
                    const st = statusOf(hb.status);
                    const pingUrl = origin ? `${origin}/api/heartbeat/${hb.token}` : "";
                    return (
                      <div
                        key={hb._id}
                        className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${st.dot}`} />
                            <span className="truncate text-sm font-medium text-foreground">
                              {hb.name}
                            </span>
                            <Badge variant="secondary" className={`${st.chip} border-0`}>
                              {st.label}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            every {Math.round(hb.expectedIntervalSec / 60)}m · last beat{" "}
                            {timeAgo(hb.lastBeatAt)}
                            {hb.lastNote ? ` · ${hb.lastNote}` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copy(`hb-${hb._id}`, pingUrl)}
                          >
                            <Copy className="mr-1 h-3.5 w-3.5" />
                            {copied === `hb-${hb._id}` ? "Copied" : "Ping URL"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleHeartbeat({ token, id: hb._id, enabled: !hb.enabled })}
                          >
                            <Power className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => removeHeartbeat({ token, id: hb._id })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Events feed */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Recent Events
            </h2>
            <Card>
              <CardContent className="pt-6">
                {(events ?? []).length === 0 ? (
                  <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                    No events yet — webhooks, heartbeats and syncs land here.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {(events ?? []).map((ev) => (
                      <li key={ev._id} className="flex items-start gap-3 text-sm">
                        <span className="mt-0.5">
                          {ev.ok ? (
                            <CircleCheck className="h-4 w-4 text-[#22C55E]" />
                          ) : (
                            <CircleX className="h-4 w-4 text-[#EF4444]" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <span className="font-medium text-foreground">{ev.summary}</span>
                          <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                            {ev.provider}
                          </span>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {timeAgo(ev.createdAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
