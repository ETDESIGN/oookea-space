"use client";

import { useState } from "react";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { ListChecks, Plus, CircleCheck, Hourglass, RotateCcw, X } from "lucide-react";

// ─── R3c: Commitments — promises to clients with dates ────────────
// open = E owes action · waiting_client = ball in their court (goes
// stale → Action Queue nudge) · done.

function fmtDue(d: string) {
  const days = Math.floor((new Date(d + "T00:00:00Z").getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { label: `${-days}d overdue`, cls: "text-[#EF4444]" };
  if (days === 0) return { label: "due today", cls: "text-[#F59E0B]" };
  if (days <= 7) return { label: `in ${days}d`, cls: "text-[#F59E0B]" };
  return { label: `in ${days}d`, cls: "text-muted-foreground" };
}

export default function CommitmentsPage() {
  const { user } = useAuth();
  const token = typeof window !== "undefined" ? localStorage.getItem("oookea_session") || "" : "";
  const items = useQuery(api.clients.listCommitments, token ? { token } : "skip");
  const clients = useQuery(api.projects.listClients, token ? { token } : "skip");
  const create = useMutation(api.clients.createCommitment);
  const setStatus = useMutation(api.clients.setCommitmentStatus);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", clientId: "", dueDate: "", nextAction: "" });

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

  const list = items ?? [];
  const open = list.filter((w) => w.status === "open");
  const waiting = list.filter((w) => w.status === "waiting_client");
  const closed = list.filter((w) => w.status === "done" || w.status === "cancelled");

  const handleCreate = async () => {
    if (!form.title || !form.dueDate) return;
    await create({
      token,
      title: form.title,
      clientId: form.clientId ? (form.clientId as Id<"users">) : undefined,
      dueDate: form.dueDate,
      nextAction: form.nextAction || undefined,
    });
    setDialogOpen(false);
    setForm({ title: "", clientId: "", dueDate: "", nextAction: "" });
  };

  const Row = ({ w }: { w: (typeof list)[number] }) => {
    const due = fmtDue(w.dueDate);
    return (
      <li className="flex flex-col gap-2 rounded-lg border bg-card p-3.5 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{w.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {w.clientName && <span>{w.clientName} · </span>}
            <span className={due.cls}>{due.label}</span>
            {w.nextAction && <span> · next: {w.nextAction}</span>}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {w.status === "open" && (
            <button
              className="flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setStatus({ token, id: w._id, status: "waiting_client" })}
              title="Ball is in the client's court"
            >
              <Hourglass className="h-3 w-3" /> Waiting on client
            </button>
          )}
          {w.status === "waiting_client" && (
            <button
              className="flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setStatus({ token, id: w._id, status: "open" })}
              title="Back to me"
            >
              <RotateCcw className="h-3 w-3" /> Back to me
            </button>
          )}
          {w.status !== "done" && (
            <button
              className="flex items-center gap-1 rounded-md border border-[#22C55E]/40 bg-[#22C55E]/10 px-2.5 py-1 text-xs font-medium text-[#22C55E] transition-colors hover:bg-[#22C55E]/20"
              onClick={() => setStatus({ token, id: w._id, status: "done" })}
            >
              <CircleCheck className="h-3 w-3" /> Done
            </button>
          )}
          {(w.status === "open" || w.status === "waiting_client") && (
            <button
              className="rounded-md px-1.5 py-1 text-xs text-muted-foreground/60 transition-colors hover:text-destructive"
              onClick={() => setStatus({ token, id: w._id, status: "cancelled" })}
              title="Cancel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </li>
    );
  };

  const Section = ({ title, rows, badgeCls }: { title: string; rows: typeof list; badgeCls: string }) => (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
        <span className={`rounded-full px-2 py-0.5 text-xs ${badgeCls}`}>{rows.length}</span>
      </h2>
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Nothing here.</p>
      ) : (
        <ul className="space-y-2">{rows.map((w) => <Row key={String(w._id)} w={w} />)}</ul>
      )}
    </section>
  );

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                <ListChecks className="h-6 w-6 text-primary" />
                Commitments
              </h1>
              <p className="mt-1 text-muted-foreground">
                Every promise gets a date. Stale &ldquo;waiting on client&rdquo; items nag you in the Action Queue.
              </p>
            </div>
            <Button className="gap-2 bg-primary hover:bg-primary/90" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" /> New commitment
            </Button>
          </div>

          {items === undefined ? (
            <Card><CardContent className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </CardContent></Card>
          ) : (
            <div className="space-y-6">
              <Section title="Mine to do" rows={open} badgeCls="bg-primary/10 text-primary" />
              <Section title="Waiting on client" rows={waiting} badgeCls="bg-[#F59E0B]/10 text-[#F59E0B]" />
              <Section title="Closed" rows={closed} badgeCls="bg-muted text-muted-foreground" />
            </div>
          )}

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>New commitment</DialogTitle>
                <DialogDescription>A promise to a client, with a date and a next step.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label>What was promised</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Send logo pack v2" autoFocus />
                </div>
                <div className="grid gap-1.5">
                  <Label>Client</Label>
                  <select
                    value={form.clientId}
                    onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                    className="flex h-9 w-full rounded-lg border border-input bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">— none —</option>
                    {(clients ?? []).map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1.5">
                    <Label>Due date</Label>
                    <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Next physical step</Label>
                    <Input value={form.nextAction} onChange={(e) => setForm({ ...form, nextAction: e.target.value })} placeholder="export SVGs" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button className="bg-primary hover:bg-primary/90" onClick={handleCreate} disabled={!form.title || !form.dueDate}>Add</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
