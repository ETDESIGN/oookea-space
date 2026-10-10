"use client";

import { useState } from "react";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Siren, Eye, CheckCircle2 } from "lucide-react";

// ─── R3e: Incidents — one object per outage, client-safe language ──
// Auto-opened/resolved by the probe engine; E adds impact + updates.

function dur(ms: number) {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export default function IncidentsPage() {
  const { user } = useAuth();
  const token = typeof window !== "undefined" ? localStorage.getItem("oookea_session") || "" : "";
  const incidents = useQuery(api.incidents.listIncidents, token ? { token } : "skip");
  const update = useMutation(api.incidents.updateIncident);
  const [note, setNote] = useState<Record<string, string>>({});

  if (user?.role !== "admin") {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex items-center justify-center py-20">
            <p className="text-muted-foreground">Access denied.</p>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  const list = incidents ?? [];
  const open = list.filter((i) => i.status !== "resolved");
  const past = list.filter((i) => i.status === "resolved").slice(0, 15);

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <Siren className="h-6 w-6 text-primary" />
              Incidents
            </h1>
            <p className="mt-1 text-muted-foreground">
              One object per outage — opened automatically when a probe fails, closed when it recovers. Client-safe language only.
            </p>
          </div>

          {incidents === undefined ? (
            <Card><CardContent className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </CardContent></Card>
          ) : (
            <>
              <section>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Ongoing <span className="ml-1 rounded-full bg-[#EF4444]/10 px-2 py-0.5 text-[#EF4444]">{open.length}</span>
                </h2>
                {open.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">All quiet — no open incidents.</p>
                ) : (
                  <ul className="space-y-3">
                    {open.map((i) => (
                      <li key={String(i._id)} className="rounded-lg border border-[#EF4444]/30 bg-card p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{i.appName}</span>
                          <Badge className="rounded-full border-0 bg-[#EF4444]/10 text-[#EF4444]">{i.severity}</Badge>
                          <Badge className="rounded-full border-0 bg-[#F59E0B]/10 text-[#F59E0B]">{i.status}</Badge>
                          <span className="text-xs text-muted-foreground">started {new Date(i.startedAt).toLocaleString()} · {dur(Date.now() - i.startedAt)} ago</span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{i.impact ?? i.title}</p>
                        {i.updates && i.updates.length > 0 && (
                          <ul className="mt-2 space-y-1 border-l-2 border-muted pl-3">
                            {i.updates.slice(-3).map((u, k) => (
                              <li key={k} className="text-xs text-muted-foreground">
                                {new Date(u.at).toLocaleTimeString()} — {u.body}
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                          <Input
                            placeholder="Add a client-safe update…"
                            value={note[String(i._id)] ?? ""}
                            onChange={(e) => setNote({ ...note, [String(i._id)]: e.target.value })}
                            className="h-8 flex-1"
                          />
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="outline" onClick={() => {
                              const body = note[String(i._id)]?.trim();
                              if (body) update({ token, id: i._id, addUpdate: body, status: "monitoring" });
                              setNote({ ...note, [String(i._id)]: "" });
                            }}><Eye className="mr-1 h-3.5 w-3.5" />Post + monitoring</Button>
                            <Button size="sm" className="bg-[#22C55E] hover:bg-[#22C55E]/90" onClick={() => update({ token, id: i._id, status: "resolved" })}>
                              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />Resolve
                            </Button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recently resolved</h2>
                {past.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Nothing yet.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {past.map((i) => (
                      <li key={String(i._id)} className="flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3.5 py-2.5 text-sm">
                        <span className="font-medium text-foreground">{i.appName}</span>
                        <span className="text-muted-foreground">{i.title}</span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {i.resolvedAt ? `${dur(i.resolvedAt - i.startedAt)} · resolved ${new Date(i.resolvedAt).toLocaleDateString()}` : ""}
                          {i.autoResolved ? " · auto" : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
