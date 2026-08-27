"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Globe, Loader2, Sparkles, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * BrandExtractor — "Business DNA" panel (admin, brand-kit page).
 * Paste a client's website URL → crawl + GLM → editable preview →
 * save directly into the brand kit.
 */

type DraftKit = {
  brandName: string | null;
  tagline: string;
  colors: { name: string; hex: string; usage: string }[];
  fonts: { role: string; family: string; note: string }[];
  logoUrl: string | null;
  toneOfVoice: string;
  usageNotes: string;
  sourceUrl: string;
};

export function BrandExtractor({ onSaved }: { onSaved: () => void }) {
  const { success, error: errorToast } = useToast();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<DraftKit | null>(null);
  const [saving, setSaving] = useState(false);

  const upsert = useMutation(api.projects.upsertBrandKit);

  const extract = async () => {
    if (!url.trim()) return;
    setBusy(true);
    setDraft(null);
    try {
      const r = await fetch("/api/brand/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: localStorage.getItem("oookea_session") || "",
          url: url.trim(),
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        errorToast("Extraction failed", data.error || "Try another URL");
        return;
      }
      setDraft(data.kit);
      success("Brand DNA extracted", "Review the draft below, then save");
    } catch {
      errorToast("Extraction failed", "Network error");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await upsert({
        token: localStorage.getItem("oookea_session") || "",
        tagline: draft.tagline || undefined,
        primaryLogo: draft.logoUrl || undefined,
        primaryLogoName: draft.brandName ? `${draft.brandName} logo (from site)` : "logo (from site)",
        logoLockupNote: draft.logoUrl ? `Source: ${draft.sourceUrl}` : undefined,
        colors: draft.colors.map((c) => ({ name: c.name, hex: c.hex, usage: c.usage })),
        fonts: draft.fonts.map((f) => ({ role: f.role, family: f.family, note: f.note })),
        toneOfVoice: draft.toneOfVoice || undefined,
        usageNotes: draft.usageNotes || undefined,
      });
      success("Brand kit saved", draft.brandName ? `Kit for ${draft.brandName} is live` : undefined);
      setDraft(null);
      setUrl("");
      onSaved();
    } catch {
      errorToast("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const setColor = (i: number, patch: Partial<DraftKit["colors"][0]>) => {
    if (!draft) return;
    const colors = [...draft.colors];
    colors[i] = { ...colors[i], ...patch };
    setDraft({ ...draft, colors });
  };

  return (
    <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.06] to-transparent p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
          <Sparkles className="h-4.5 w-4.5 text-primary" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Auto-build from website</h3>
          <p className="text-xs text-muted-foreground">
            Paste the client&apos;s site — we extract palette, fonts, logo & tone (their Brand DNA)
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Input
          placeholder="client-website.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && extract()}
          className="font-mono text-sm"
        />
        <Button onClick={extract} disabled={busy || !url.trim()} className="gap-2 bg-primary text-white hover:bg-primary/90">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
          {busy ? "Analyzing…" : "Extract"}
        </Button>
      </div>

      {busy && (
        <div className="mt-4 space-y-2">
          {["Fetching homepage & stylesheets…", "Ranking colors & fonts…", "AI assembling the kit…"].map((s, i) => (
            <div key={s} className="flex items-center gap-2 text-xs text-muted-foreground" style={{ opacity: 1 - i * 0.25 }}>
              <Loader2 className="h-3 w-3 animate-spin" />
              {s}
            </div>
          ))}
        </div>
      )}

      {draft && (
        <div className="mt-5 space-y-4 rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-lg font-bold text-foreground">{draft.brandName || "Brand"}</p>
              <p className="mt-0.5 text-xs italic text-muted-foreground">“{draft.tagline}”</p>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-[#22C55E]/10 px-2 py-1 text-[10px] font-semibold text-[#16A34A]">
              <Check className="h-3 w-3" /> DRAFT
            </span>
          </div>

          {draft.logoUrl && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-white p-3">
              <img src={draft.logoUrl} alt="logo" className="max-h-12 object-contain" />
              <span className="text-[11px] text-muted-foreground">Logo found on site (og:image / icon)</span>
            </div>
          )}

          {/* Colors — editable */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Palette</p>
            <div className="space-y-2">
              {draft.colors.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="h-9 w-9 shrink-0 rounded-md border border-border" style={{ backgroundColor: c.hex }} />
                  <input
                    value={c.name}
                    onChange={(e) => setColor(i, { name: e.target.value })}
                    className="h-9 w-32 rounded-md border border-input bg-background px-2 text-xs"
                  />
                  <span className="w-20 font-mono text-[11px] uppercase text-muted-foreground">{c.hex}</span>
                  <input
                    value={c.usage}
                    onChange={(e) => setColor(i, { usage: e.target.value })}
                    className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-xs"
                    placeholder="usage"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Fonts */}
          <div className="flex flex-wrap gap-2">
            {draft.fonts.map((f) => (
              <span key={f.family + f.role} className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs">
                <span className="font-semibold text-primary">{f.role}:</span> {f.family}
              </span>
            ))}
          </div>

          {/* Tone */}
          {draft.toneOfVoice && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tone of voice</p>
              <p className="text-xs leading-relaxed text-foreground">{draft.toneOfVoice}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>
              <X className="h-3.5 w-3.5" /> Discard
            </Button>
            <Button size="sm" onClick={save} disabled={saving} className="gap-1.5 bg-primary text-white hover:bg-primary/90">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save as Brand Kit
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
