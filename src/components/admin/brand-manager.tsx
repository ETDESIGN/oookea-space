"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Palette, Upload, Check } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

/**
 * BrandManager — admin sets the client's co-branding: logo URL + accent color.
 * The lockup (CLIENT × OOOKEA) appears in the sidebar + login immediately.
 */
export function BrandManager({ clientId }: { clientId: string }) {
  const sessionToken =
    typeof window !== "undefined" ? localStorage.getItem("oookea_session") || "" : "";
  const [logoUrl, setLogoUrl] = useState("");
  const [color, setColor] = useState("#1E40AF");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const setBrand = useMutation(api.projects.setClientBrand);
  const generateUploadUrl = useMutation(api.projects.generateUploadUrl);

  const handleUpload = async (file: File) => {
    const postUrl = await generateUploadUrl({ token: sessionToken });
    const res = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": file.type || "image/png" },
      body: file,
    });
    const json = await res.json();
    if (json.storageId) {
      setLogoUrl(`/api/file/${json.storageId}`);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await setBrand({
        token: sessionToken,
        clientId: clientId as Id<"users">,
        brandLogo: logoUrl || undefined,
        brandColor: color || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Preview lockup */}
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/40 p-4">
        {logoUrl ? (
          <img src={logoUrl} alt="Client logo" className="h-7 w-auto max-w-[130px] object-contain" />
        ) : (
          <span className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Client name
          </span>
        )}
        <span className="text-xs font-light text-muted-foreground">×</span>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#6366F1] to-[#4F46E5]">
            <span className="text-sm font-black text-white">O</span>
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-bold tracking-tight">Oookea</span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Digital Atelier
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-sm">Client logo</Label>
          <div className="flex gap-2">
            <Input
              placeholder="https://… or upload →"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="bg-background"
            />
            <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm hover:bg-muted">
              <Upload className="h-3.5 w-3.5" />
              Upload
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                }}
              />
            </label>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">Accent color (login screen fallback)</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-12 cursor-pointer rounded-md border border-input bg-background"
            />
            <Input value={color} onChange={(e) => setColor(e.target.value)} className="bg-background" />
          </div>
        </div>

        <Button
          onClick={save}
          disabled={saving}
          className="bg-primary text-white hover:bg-primary/90"
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : saved ? <Check className="mr-2 h-4 w-4" /> : <Palette className="mr-2 h-4 w-4" />}
          {saved ? "Saved" : "Save branding"}
        </Button>
      </div>
    </div>
  );
}
