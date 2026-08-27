"use client";

import { useState } from "react";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { EmptyState, BrandLoader } from "@/components/studio/illustrations";
import { BrandExtractor } from "@/components/admin/brand-extractor";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Copy, Check, Type, Palette, Sparkles, ShieldCheck, Pencil, Plus, Trash2, Download } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Brand Kit — per-client brand source of truth.
 * Editorial presentation; admins get an inline editor.
 * Copy-on-click hex chips everywhere.
 */

type Color = { name: string; hex: string; usage?: string };
type Font = { role: string; family: string; note?: string };

type Kit = {
  _id: string;
  tagline?: string;
  primaryLogo?: string;
  primaryLogoName?: string;
  monoLogo?: string;
  monoLogoName?: string;
  logoLockupNote?: string;
  colors?: Color[];
  fonts?: Font[];
  toneOfVoice?: string;
  usageNotes?: string;
};

function HexChip({ hex, name, usage }: Color) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(hex).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <button
      onClick={copy}
      className="group flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:-translate-y-0.5 hover:shadow-lg"
      title={`Copy ${hex}`}
    >
      <span className="relative h-20 w-full" style={{ backgroundColor: hex }}>
        {copied && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
            <Check className="h-5 w-5 text-white" />
          </span>
        )}
      </span>
      <span className="flex items-center justify-between px-3 py-2">
        <span className="min-w-0">
          <span className="block truncate text-xs font-semibold text-foreground">{name}</span>
          <span className="block font-mono text-[11px] uppercase text-muted-foreground">
            {hex}
          </span>
        </span>
        <Copy className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
      </span>
      {usage && (
        <span className="border-t border-border/60 px-3 py-1.5 text-[10px] leading-snug text-muted-foreground">
          {usage}
        </span>
      )}
    </button>
  );
}

export default function BrandKitPage() {
  const { user } = useAuth();
  const { success } = useToast();
  const isAdmin = user?.role === "admin";
  const sessionToken = typeof window !== "undefined" ? localStorage.getItem("oookea_session") || "" : "";
  const kit = useQuery(
    api.projects.getBrandKit,
    sessionToken ? { token: sessionToken } : "skip"
  ) as Kit | null | undefined;

  const upsert = useMutation(api.projects.upsertBrandKit);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<Kit>>({});

  // ── editor helpers ──
  const startEdit = () => {
    setDraft({
      tagline: kit?.tagline ?? "",
      logoLockupNote: kit?.logoLockupNote ?? "",
      colors: kit?.colors ?? [],
      fonts: kit?.fonts ?? [],
      toneOfVoice: kit?.toneOfVoice ?? "",
      usageNotes: kit?.usageNotes ?? "",
    });
    setEditing(true);
  };

  const save = async () => {
    await upsert({
      token: sessionToken,
      tagline: draft.tagline || undefined,
      logoLockupNote: draft.logoLockupNote || undefined,
      colors: draft.colors && draft.colors.length ? draft.colors : undefined,
      fonts: draft.fonts && draft.fonts.length ? draft.fonts : undefined,
      toneOfVoice: draft.toneOfVoice || undefined,
      usageNotes: draft.usageNotes || undefined,
    });
    setEditing(false);
    success("Brand kit saved");
  };

  const downloadAll = () => {
    // simple brand reference sheet as text
    const lines = [
      `BRAND KIT — ${user?.company ?? user?.name ?? ""}`,
      kit?.tagline ? `Tagline: ${kit.tagline}` : "",
      "",
      "COLORS",
      ...(kit?.colors ?? []).map((c) => `- ${c.name}: ${c.hex}${c.usage ? ` (${c.usage})` : ""}`),
      "",
      "TYPOGRAPHY",
      ...(kit?.fonts ?? []).map((f) => `- ${f.role}: ${f.family}${f.note ? ` — ${f.note}` : ""}`),
      "",
      kit?.toneOfVoice ? `TONE OF VOICE\n${kit.toneOfVoice}` : "",
      kit?.usageNotes ? `USAGE NOTES\n${kit.usageNotes}` : "",
    ];
    const blob = new Blob([lines.filter(Boolean).join("\n")], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "brand-kit.txt";
    a.click();
    URL.revokeObjectURL(a.href);
    success("Brand reference downloaded");
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-8">
          {isAdmin && (
            <BrandExtractor onSaved={() => window.location.reload()} />
          )}

          {/* Header */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
                Brand Kit
              </h1>
              <p className="mt-1.5 text-muted-foreground">
                {kit?.tagline || "The single source of truth for your brand — always current, always ours to keep consistent."}
              </p>
            </div>
            <div className="flex gap-2">
              {kit && (
                <Button variant="outline" className="gap-2" onClick={downloadAll}>
                  <Download className="h-4 w-4" /> Reference sheet
                </Button>
              )}
              {isAdmin &&
                (editing ? (
                  <>
                    <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                    <Button className="bg-primary text-white hover:bg-primary/90" onClick={save}>
                      Save kit
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" className="gap-2" onClick={startEdit}>
                    <Pencil className="h-4 w-4" /> {kit ? "Edit" : "Create kit"}
                  </Button>
                ))}
            </div>
          </div>

          {kit === undefined ? (
            <BrandLoader />
          ) : !kit ? (
            isAdmin ? (
              editing ? (
                <KitEditor draft={draft} setDraft={setDraft} />
              ) : (
                <EmptyState
                  variant="generic"
                  title="No brand kit yet"
                  body="Create the kit — logos, palette, type, tone — and it becomes the reference for every deliverable."
                />
              )
            ) : (
              <EmptyState
                variant="generic"
                title="Your brand kit is being prepared"
                body="The studio is assembling your brand reference — logos, colors, and typography guidance. It will appear here soon."
              />
            )
          ) : (
            <>
              {/* Logos */}
              {(kit.primaryLogo || kit.monoLogo) && (
                <section className="space-y-3">
                  <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    <ShieldCheck className="h-4 w-4" /> Logos
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {kit.primaryLogo && (
                      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6">
                        <img src={kit.primaryLogo} alt={kit.primaryLogoName || "Primary logo"} className="max-h-24 object-contain" />
                        <p className="text-xs text-muted-foreground">
                          Primary — {kit.primaryLogoName || "logo"}
                        </p>
                        <a href={kit.primaryLogo} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary hover:underline">
                          Open original
                        </a>
                      </div>
                    )}
                    {kit.monoLogo && (
                      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-black p-6">
                        <img src={kit.monoLogo} alt={kit.monoLogoName || "Monochrome logo"} className="max-h-24 object-contain brightness-0 invert" />
                        <p className="text-xs text-zinc-500">
                          Mono — {kit.monoLogoName || "logo"}
                        </p>
                        <a href={kit.monoLogo} target="_blank" rel="noreferrer" className="text-xs font-medium text-indigo-400 hover:underline">
                          Open original
                        </a>
                      </div>
                    )}
                  </div>
                  {kit.logoLockupNote && (
                    <p className="rounded-xl bg-muted px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                      {kit.logoLockupNote}
                    </p>
                  )}
                </section>
              )}

              {/* Colors */}
              {kit.colors && kit.colors.length > 0 && (
                <section className="space-y-3">
                  <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    <Palette className="h-4 w-4" /> Palette — click to copy
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {kit.colors.map((c) => (
                      <div key={c.name + c.hex} className="min-w-[140px] flex-1">
                        <HexChip {...c} />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Typography */}
              {kit.fonts && kit.fonts.length > 0 && (
                <section className="space-y-3">
                  <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    <Type className="h-4 w-4" /> Typography
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-3">
                    {kit.fonts.map((f) => (
                      <div key={f.role + f.family} className="rounded-2xl border border-border bg-card p-5">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">{f.role}</p>
                        <p className="font-display mt-1 text-lg font-semibold text-foreground">{f.family}</p>
                        {f.note && <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{f.note}</p>}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Tone of voice */}
              {kit.toneOfVoice && (
                <section className="space-y-3">
                  <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    <Sparkles className="h-4 w-4" /> Tone of voice
                  </h2>
                  <p className="whitespace-pre-wrap rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed text-foreground">
                    {kit.toneOfVoice}
                  </p>
                </section>
              )}

              {/* Usage notes */}
              {kit.usageNotes && (
                <section className="space-y-3">
                  <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    <ShieldCheck className="h-4 w-4" /> Usage rules
                  </h2>
                  <p className="whitespace-pre-wrap rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed text-muted-foreground">
                    {kit.usageNotes}
                  </p>
                </section>
              )}

              {/* Admin edit inline (when editing an existing kit) */}
              {isAdmin && editing && <KitEditor draft={draft} setDraft={setDraft} />}
            </>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

// ── Inline editor (admin) ─────────────────────────────────────────

function KitEditor({
  draft,
  setDraft,
}: {
  draft: Partial<Kit>;
  setDraft: (d: Partial<Kit>) => void;
}) {
  const setColor = (i: number, patch: Partial<Color>) => {
    const colors = [...(draft.colors ?? [])];
    colors[i] = { ...colors[i], ...patch };
    setDraft({ ...draft, colors });
  };
  const setFont = (i: number, patch: Partial<Font>) => {
    const fonts = [...(draft.fonts ?? [])];
    fonts[i] = { ...fonts[i], ...patch };
    setDraft({ ...draft, fonts });
  };

  return (
    <div className="space-y-6 rounded-2xl border border-primary/25 bg-primary/[0.03] p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">Editing brand kit</p>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground">Tagline</label>
        <Input
          value={draft.tagline ?? ""}
          onChange={(e) => setDraft({ ...draft, tagline: e.target.value })}
          placeholder="One line that captures the brand"
        />
      </div>

      {/* Colors editor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-foreground">Colors</label>
          <button
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            onClick={() =>
              setDraft({ ...draft, colors: [...(draft.colors ?? []), { name: "New color", hex: "#6366F1" }] })
            }
          >
            <Plus className="h-3 w-3" /> Add color
          </button>
        </div>
        {(draft.colors ?? []).map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="color"
              value={c.hex}
              onChange={(e) => setColor(i, { hex: e.target.value })}
              className="h-9 w-10 cursor-pointer rounded-md border border-border bg-transparent"
            />
            <Input value={c.name} onChange={(e) => setColor(i, { name: e.target.value })} className="h-9" placeholder="Name" />
            <Input value={c.usage ?? ""} onChange={(e) => setColor(i, { usage: e.target.value })} className="h-9" placeholder="Usage (optional)" />
            <button
              className="rounded-md p-2 text-muted-foreground hover:text-red-500"
              onClick={() => setDraft({ ...draft, colors: draft.colors!.filter((_, x) => x !== i) })}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Fonts editor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-foreground">Typography</label>
          <button
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            onClick={() =>
              setDraft({ ...draft, fonts: [...(draft.fonts ?? []), { role: "Body", family: "Font name" }] })
            }
          >
            <Plus className="h-3 w-3" /> Add font
          </button>
        </div>
        {(draft.fonts ?? []).map((f, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input value={f.role} onChange={(e) => setFont(i, { role: e.target.value })} className="h-9 w-24" placeholder="Role" />
            <Input value={f.family} onChange={(e) => setFont(i, { family: e.target.value })} className="h-9" placeholder="Family" />
            <Input value={f.note ?? ""} onChange={(e) => setFont(i, { note: e.target.value })} className="h-9" placeholder="Note (optional)" />
            <button
              className="rounded-md p-2 text-muted-foreground hover:text-red-500"
              onClick={() => setDraft({ ...draft, fonts: draft.fonts!.filter((_, x) => x !== i) })}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground">Tone of voice</label>
        <Textarea
          rows={3}
          value={draft.toneOfVoice ?? ""}
          onChange={(e) => setDraft({ ...draft, toneOfVoice: e.target.value })}
          placeholder="How the brand speaks — 3-4 lines max"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground">Usage rules / logo notes</label>
        <Textarea
          rows={2}
          value={draft.logoLockupNote ?? ""}
          onChange={(e) => setDraft({ ...draft, logoLockupNote: e.target.value })}
          placeholder="Clear space, minimum size, lockup rules…"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground">General usage notes</label>
        <Textarea
          rows={2}
          value={draft.usageNotes ?? ""}
          onChange={(e) => setDraft({ ...draft, usageNotes: e.target.value })}
          placeholder="Do's and don'ts"
        />
      </div>
    </div>
  );
}
