"use client";

import { useState } from "react";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { FileHeart, Plus, Send, Trash2, Pencil, CheckCircle2 } from "lucide-react";

// ─── R3d: Client value reports — retention collateral ─────────────
// Generate a draft (metrics auto-filled from real data), tell the
// story in plain English, publish → client portal.

function monthBounds() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export default function ReportsPage() {
  const { user } = useAuth();
  const token = typeof window !== "undefined" ? localStorage.getItem("oookea_session") || "" : "";
  const reports = useQuery(api.reports.listReports, token ? { token } : "skip");
  const clients = useQuery(api.projects.listClients, token ? { token } : "skip");
  const gen = useMutation(api.reports.generateDraft);
  const update = useMutation(api.reports.updateReport);
  const del = useMutation(api.reports.deleteReport);

  const [genOpen, setGenOpen] = useState(false);
  type Report = NonNullable<typeof reports>[number];
  const [genForm, setGenForm] = useState(() => {
    const b = monthBounds();
    return { clientId: "", periodStart: b.start, periodEnd: b.end };
  });
  const [edit, setEdit] = useState<null | Report>(null);
  const [editForm, setEditForm] = useState({ title: "", summary: "", wins: "" });

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

  const openEditor = (r: Report) => {
    setEdit(r);
    setEditForm({ title: r.title, summary: r.summary, wins: (r.wins ?? []).join("\n") });
  };

  const handleGenerate = async () => {
    await gen({
      token,
      clientId: genForm.clientId ? (genForm.clientId as Id<"users">) : undefined,
      periodStart: genForm.periodStart,
      periodEnd: genForm.periodEnd,
    });
    setGenOpen(false);
  };

  const handleSave = async (publish: boolean) => {
    if (!edit) return;
    await update({
      token,
      id: edit._id,
      title: editForm.title,
      summary: editForm.summary,
      wins: editForm.wins.split("\n").map((w) => w.trim()).filter(Boolean),
      publish: publish || undefined,
    });
    setEdit(null);
  };

  const list = reports ?? [];
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                <FileHeart className="h-6 w-6 text-primary" />
                Value Reports
              </h1>
              <p className="mt-1 text-muted-foreground">
                Monthly recaps in the client&apos;s own numbers — uptime, work shipped, incidents resolved. Retention collateral.
              </p>
            </div>
            <Button className="gap-2 bg-primary hover:bg-primary/90" onClick={() => setGenOpen(true)}>
              <Plus className="h-4 w-4" /> Generate draft
            </Button>
          </div>

          {reports === undefined ? (
            <Card><CardContent className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </CardContent></Card>
          ) : list.length === 0 ? (
            <Card><CardContent className="flex flex-col items-center gap-2 py-16 text-center">
              <FileHeart className="h-10 w-10 text-muted-foreground/40" />
              <p className="font-medium text-foreground">No reports yet</p>
              <p className="text-sm text-muted-foreground">Generate a draft — the numbers fill themselves from real data.</p>
            </CardContent></Card>
          ) : (
            <ul className="space-y-2">
              {list.map((r) => (
                <li key={String(r._id)} className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                      {r.title}
                      {r.status === "published" ? (
                        <Badge className="rounded-full border-0 bg-[#22C55E]/10 text-[#22C55E]">Published</Badge>
                      ) : (
                        <Badge className="rounded-full border-0 bg-[#F59E0B]/10 text-[#F59E0B]">Draft</Badge>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {r.clientName ?? "All clients"} · {r.periodStart} → {r.periodEnd}
                      {r.metrics && r.metrics.length > 0 && <> · {r.metrics.length} metrics</>}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openEditor(r)}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    {r.status === "draft" && (
                      <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90" onClick={() => update({ token, id: r._id, publish: true })}>
                        <Send className="h-3.5 w-3.5" /> Publish
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => del({ token, id: r._id })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Generate dialog */}
          <Dialog open={genOpen} onOpenChange={setGenOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Generate report draft</DialogTitle>
                <DialogDescription>Uptime, completed requests, incidents and invoices are pulled from real data.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label>Client</Label>
                  <select
                    value={genForm.clientId}
                    onChange={(e) => setGenForm({ ...genForm, clientId: e.target.value })}
                    className="flex h-9 w-full rounded-lg border border-input bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">— general / all clients —</option>
                    {(clients ?? []).map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1.5">
                    <Label>Period start</Label>
                    <Input type="date" value={genForm.periodStart} onChange={(e) => setGenForm({ ...genForm, periodStart: e.target.value })} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Period end</Label>
                    <Input type="date" value={genForm.periodEnd} onChange={(e) => setGenForm({ ...genForm, periodEnd: e.target.value })} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setGenOpen(false)}>Cancel</Button>
                <Button className="bg-primary hover:bg-primary/90" onClick={handleGenerate}>Generate</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Editor dialog */}
          <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Edit report</DialogTitle>
                <DialogDescription>Plain English beats jargon. The client reads this.</DialogDescription>
              </DialogHeader>
              {edit && (
                <div className="grid gap-3">
                  <div className="grid gap-1.5">
                    <Label>Title</Label>
                    <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>The story — what changed, in their terms</Label>
                    <Textarea rows={5} value={editForm.summary} onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Wins — one per line</Label>
                    <Textarea rows={3} value={editForm.wins} onChange={(e) => setEditForm({ ...editForm, wins: e.target.value })} placeholder={"Shipped the new checkout flow\nCut page load in half"} />
                  </div>
                  {edit.metrics && edit.metrics.length > 0 && (
                    <div className="rounded-lg border bg-muted/40 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Auto-filled metrics</p>
                      <div className="grid grid-cols-2 gap-2">
                        {edit.metrics.map((m: { label: string; value: string; note?: string }, i: number) => (
                          <div key={i} className="rounded-md bg-card p-2 text-center">
                            <p className="text-lg font-semibold text-foreground">{m.value}</p>
                            <p className="text-xs text-muted-foreground">{m.label}{m.note ? ` · ${m.note}` : ""}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button>
                <Button variant="outline" className="gap-1.5" onClick={() => handleSave(false)}>
                  <CheckCircle2 className="h-4 w-4" /> Save draft
                </Button>
                <Button className="gap-1.5 bg-primary hover:bg-primary/90" onClick={() => handleSave(true)}>
                  <Send className="h-4 w-4" /> Save &amp; publish
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
