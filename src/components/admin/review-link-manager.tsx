"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { Id } from "../../../convex/_generated/dataModel";
import {
  Share2,
  Copy,
  Check,
  Link2,
  Eye,
  Trash2,
  Loader2,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ReviewLinkManager — admin UI to create, share, and revoke public
 * password-protected review links for a project.
 */
export function ReviewLinkManager({ projectId, projectName }: { projectId: string; projectName: string }) {
  const { success, error } = useToast();
  const sessionToken = typeof window !== "undefined" ? localStorage.getItem("oookea_session") || "" : "";

  const links = useQuery(
    api.projects.listReviewLinks,
    sessionToken ? { token: sessionToken, projectId: projectId as Id<"projects"> } : "skip"
  ) as any[] | undefined;

  const create = useMutation(api.projects.createReviewLink);
  const revoke = useMutation(api.projects.revokeReviewLink);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [password, setPassword] = useState("");
  const [days, setDays] = useState(30);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const genPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    const arr = new Uint8Array(10);
    crypto.getRandomValues(arr);
    setPassword(Array.from(arr).map((b) => chars[b % chars.length]).join(""));
  };

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 1600);
  };

  const shareBlurb = (link: any) =>
    `Hi — here is the review link for "${link.title}":\n\n${window.location.origin}/review/${link.token}\nPassword: (as shared separately)\n\nIt expires ${new Date(link.expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.\n\n— Oookea Digital Atelier`;

  const handleCreate = async () => {
    if (!password || password.length < 6) {
      error("Password too short", "Use at least 6 characters");
      return;
    }
    setBusy(true);
    try {
      const token = await create({
        token: sessionToken,
        projectId: projectId as Id<"projects">,
        title: title.trim() || `${projectName} — review`,
        password,
        expiresInDays: days,
      });
      success("Review link created", "Copy the link + password below");
      setOpen(false);
      setTitle("");
      setPassword("");
      if (token) {
        copy(`${window.location.origin}/review/${token}`, "new-link");
      }
    } catch {
      error("Could not create link");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Create */}
      {!open ? (
        <Button
          onClick={() => {
            setOpen(true);
            genPassword();
          }}
          variant="outline"
          className="gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
        >
          <Share2 className="h-4 w-4" />
          Share for review
        </Button>
      ) : (
        <div className="space-y-3 rounded-xl border border-border bg-background p-4">
          <div className="space-y-1.5">
            <Label className="text-sm">Link title</Label>
            <Input
              placeholder={`${projectName} — review`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <div className="space-y-1.5">
              <Label className="text-sm">Password</Label>
              <div className="flex gap-2">
                <Input value={password} onChange={(e) => setPassword(e.target.value)} className="font-mono" />
                <Button variant="outline" size="icon" onClick={genPassword} title="Regenerate">
                  <Lock className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Expires</Label>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={busy} className="bg-primary text-white hover:bg-primary/90">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                Create
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Active links */}
      {links && links.length > 0 && (
        <div className="space-y-2">
          {links.map((link: any) => {
            const url = `${typeof window !== "undefined" ? window.location.origin : ""}/review/${link.token}`;
            const expired = link.expiresAt < Date.now();
            return (
              <div
                key={link._id}
                className={cn(
                  "space-y-2 rounded-xl border p-3",
                  expired ? "border-border/50 opacity-60" : "border-border bg-card"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{link.title}</p>
                  <div className="flex items-center gap-1.5">
                    {link.views > 0 && (
                      <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        <Eye className="h-3 w-3" /> {link.views} view{link.views > 1 ? "s" : ""}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-[#EF4444]"
                      onClick={async () => {
                        await revoke({ token: sessionToken, linkToken: link.token });
                        success("Link revoked");
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <code className="max-w-full truncate rounded bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground">
                    {url}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={() => copy(url, link._id)}
                  >
                    {copied === link._id ? <Check className="h-3 w-3 text-[#22C55E]" /> : <Copy className="h-3 w-3" />}
                    Link
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={() => copy(shareBlurb(link), link._id + "-blurb")}
                  >
                    {copied === link._id + "-blurb" ? <Check className="h-3 w-3 text-[#22C55E]" /> : <Copy className="h-3 w-3" />}
                    Email blurb
                  </Button>
                  <span className="ml-auto text-muted-foreground/70">
                    {expired ? "Expired" : `Expires ${new Date(link.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
