"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/lib/auth";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  DollarSign,
  Receipt,
  TrendingUp,
  AlertTriangle,
  HeartPulse,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Admin Analytics — revenue snapshot (paid/outstanding/aging, per-client)
 * + client health scores (login recency, unanswered threads, overdue).
 */

const money = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function AdminAnalyticsPage() {
  const { user } = useAuth();
  const sessionToken =
    typeof window !== "undefined" ? localStorage.getItem("oookea_session") || "" : "";

  const data = useQuery(
    api.projects.revenueSnapshot,
    sessionToken ? { token: sessionToken } : "skip"
  ) as any;

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
            <p className="mt-1 text-muted-foreground">
              Revenue health and client relationships at a glance.
            </p>
          </div>

          {data === undefined ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* ── Revenue totals ─────────────────────────────── */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile
                  label="Paid to date"
                  value={money(data.totals.paidTotal)}
                  sub={`${data.totals.paidCount} invoices`}
                  icon={<DollarSign className="h-5 w-5" />}
                  tone="good"
                />
                <StatTile
                  label="Outstanding"
                  value={money(data.totals.outstandingTotal)}
                  sub={`${data.totals.outstandingCount} invoices`}
                  icon={<Receipt className="h-5 w-5" />}
                  tone={data.totals.outstandingTotal > 0 ? "warn" : "good"}
                />
                <StatTile
                  label="Drafts"
                  value={money(data.totals.draftsTotal)}
                  sub={`${data.totals.draftsCount} invoices`}
                  icon={<TrendingUp className="h-5 w-5" />}
                  tone="neutral"
                />
                <StatTile
                  label="Overdue 60d+"
                  value={money(data.aging.d60 + data.aging.d90)}
                  sub="aging bucket"
                  icon={<AlertTriangle className="h-5 w-5" />}
                  tone={data.aging.d60 + data.aging.d90 > 0 ? "bad" : "good"}
                />
              </div>

              {/* ── Aging + per-client revenue ──────────────────── */}
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Outstanding aging</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AgingBars aging={data.aging} />
                  </CardContent>
                </Card>

                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Revenue per client</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {data.perClient.length === 0 ? (
                      <p className="py-4 text-center text-sm text-muted-foreground">No data yet.</p>
                    ) : (
                      data.perClient.map((c: any) => (
                        <div key={c.clientId} className="space-y-1">
                          <div className="flex items-baseline justify-between">
                            <p className="text-sm font-medium text-foreground">
                              {c.company || c.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {money(c.paidTotal)}
                              {c.outstandingTotal > 0 && (
                                <span className="ml-2 text-[#D97706]">
                                  +{money(c.outstandingTotal)} open
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#6366F1] to-[#818CF8] transition-all duration-700"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (c.paidTotal /
                                    Math.max(1, ...data.perClient.map((x: any) => x.paidTotal))) *
                                    100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* ── Client health ──────────────────────────────── */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <HeartPulse className="h-4 w-4 text-primary" /> Client health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.health.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">No clients yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                            <th className="pb-2 pr-4 font-medium">Client</th>
                            <th className="pb-2 pr-4 font-medium">Status</th>
                            <th className="pb-2 pr-4 font-medium">Last login</th>
                            <th className="pb-2 pr-4 font-medium">Unanswered</th>
                            <th className="pb-2 pr-4 font-medium">Overdue</th>
                            <th className="pb-2 font-medium">Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.health.map((h: any) => (
                            <tr key={h.clientId} className="border-b border-border/50 last:border-0">
                              <td className="py-3 pr-4 font-medium text-foreground">
                                {h.company || h.name}
                              </td>
                              <td className="py-3 pr-4">
                                <HealthDot band={h.band} />
                              </td>
                              <td className="py-3 pr-4 text-muted-foreground">
                                {h.daysSinceLogin === 0
                                  ? "Today"
                                  : h.daysSinceLogin > 30
                                    ? `${h.daysSinceLogin}d ⚠️`
                                    : `${h.daysSinceLogin}d`}
                              </td>
                              <td className="py-3 pr-4 text-muted-foreground">
                                {h.unansweredThreads > 0 ? (
                                  <span className="font-medium text-[#D97706]">
                                    {h.unansweredThreads}
                                  </span>
                                ) : (
                                  "0"
                                )}
                              </td>
                              <td className="py-3 pr-4 text-muted-foreground">
                                {h.overdueInvoices > 0 ? (
                                  <span className="font-medium text-[#DC2626]">
                                    {h.overdueInvoices}
                                  </span>
                                ) : (
                                  "0"
                                )}
                              </td>
                              <td className="py-3">
                                <span
                                  className={cn(
                                    "inline-flex h-8 w-12 items-center justify-center rounded-lg text-xs font-bold",
                                    h.band === "good" && "bg-[#22C55E]/10 text-[#16A34A]",
                                    h.band === "watch" && "bg-[#F59E0B]/10 text-[#D97706]",
                                    h.band === "risk" && "bg-[#EF4444]/10 text-[#DC2626]"
                                  )}
                                >
                                  {h.score}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

function StatTile({ label, value, sub, icon, tone }: {
  label: string; value: string; sub: string; icon: React.ReactNode;
  tone: "good" | "warn" | "bad" | "neutral";
}) {
  return (
    <Card className="border-border">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              tone === "good" && "bg-[#22C55E]/10 text-[#16A34A]",
              tone === "warn" && "bg-[#F59E0B]/10 text-[#D97706]",
              tone === "bad" && "bg-[#EF4444]/10 text-[#DC2626]",
              tone === "neutral" && "bg-primary/10 text-primary"
            )}
          >
            {icon}
          </div>
        </div>
        <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground/70">{sub}</p>
      </CardContent>
    </Card>
  );
}

function AgingBars({ aging }: { aging: { current: number; d30: number; d60: number; d90: number } }) {
  const rows = [
    { label: "Current", value: aging.current, color: "bg-[#22C55E]" },
    { label: "1–30 days", value: aging.d30, color: "bg-[#F59E0B]" },
    { label: "31–60 days", value: aging.d60, color: "bg-[#F97316]" },
    { label: "60+ days", value: aging.d90, color: "bg-[#EF4444]" },
  ];
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{r.label}</span>
            <span className="font-medium text-foreground">{money(r.value)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all duration-700", r.color)}
              style={{ width: `${(r.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function HealthDot({ band }: { band: "good" | "watch" | "risk" }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={cn(
          "h-2.5 w-2.5 rounded-full",
          band === "good" && "bg-[#22C55E]",
          band === "watch" && "bg-[#F59E0B]",
          band === "risk" && "bg-[#EF4444]"
        )}
      />
      <span className="text-xs capitalize text-muted-foreground">{band}</span>
    </span>
  );
}
