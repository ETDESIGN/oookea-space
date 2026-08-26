"use client";

import { use, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Lock, Loader2, CheckCircle2, XCircle, Clock, MessageSquareWarning } from "lucide-react";

/**
 * Public review page — /review/[token]
 * Stakeholders without accounts unlock with the link password, see the
 * deliverable status board, and leave named comments.
 */

export default function ReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token: linkToken } = use(params);
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [unlockError, setUnlockError] = useState("");
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [posted, setPosted] = useState(false);

  const meta = useQuery(api.projects.openReviewLink, { linkToken }) as any;
  const unlock = useMutation(api.projects.unlockReviewLink);
  const addComment = useMutation(api.projects.addReviewComment);
  const comments = useQuery(api.projects.listReviewComments, { linkToken }) as any;

  const content = unlocked
    ? (window as any).__reviewData
    : null;

  const handleUnlock = async () => {
    setUnlockError("");
    const result = await unlock({ linkToken, password });
    if (!result) {
      setUnlockError("Incorrect password or expired link.");
      return;
    }
    (window as any).__reviewData = result;
    setUnlocked(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#F8FAFC] to-[#EEF2FF] px-4">
      <div className="w-full max-w-2xl">
        {/* Lockup: Oookea mark always present */}
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#6366F1] to-[#4F46E5] shadow-[0_2px_12px_-2px_rgba(99,102,241,0.5)]">
            <span className="text-lg font-black text-white">O</span>
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-lg font-bold tracking-tight text-[#0F172A]">Oookea</span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
              Digital Atelier
            </span>
          </div>
        </div>

        {meta === undefined ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#6366F1]" />
          </div>
        ) : meta === null ? (
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-10 text-center shadow-xl">
            <XCircle className="mx-auto mb-3 h-10 w-10 text-[#EF4444]" />
            <h1 className="text-lg font-semibold text-[#0F172A]">Link unavailable</h1>
            <p className="mt-1 text-sm text-[#64748B]">
              This review link has expired or was revoked.
            </p>
          </div>
        ) : !unlocked ? (
          /* ── Password gate ─────────────────────────────────────── */
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-xl">
            <div className="mb-6 text-center">
              <Lock className="mx-auto mb-3 h-8 w-8 text-[#6366F1]" />
              <h1 className="text-xl font-bold text-[#0F172A]">{meta.title}</h1>
              <p className="mt-1 text-sm text-[#64748B]">
                {meta.projectTitle} · enter the password you received
              </p>
            </div>
            {unlockError && (
              <p className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-center text-sm text-red-600">
                {unlockError}
              </p>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUnlock();
              }}
              className="space-y-3"
            >
              <Input
                type="password"
                placeholder="Review password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 text-center"
                autoFocus
              />
              <Button
                type="submit"
                className="h-11 w-full bg-[#6366F1] text-white hover:bg-[#4F46E5]"
                disabled={!password}
              >
                Unlock review
              </Button>
            </form>
          </div>
        ) : (
          /* ── Unlocked: deliverables + comments ──────────────────── */
          <div className="space-y-6">
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-xl">
              <h1 className="text-xl font-bold text-[#0F172A]">{content.title}</h1>
              <p className="mt-1 text-sm text-[#64748B]">
                {content.project?.title} · {content.project?.progress ?? 0}% approved
              </p>

              <div className="mt-6 space-y-3">
                {content.deliverables.map((d: any) => {
                  const st = d.status;
                  return (
                    <div
                      key={d.title}
                      className={`flex items-center gap-3 rounded-xl border p-3 ${
                        st === "approved"
                          ? "border-[#22C55E]/30 bg-[#22C55E]/5"
                          : st === "rejected"
                            ? "border-[#EF4444]/30 bg-[#EF4444]/5"
                            : st === "changes_requested"
                              ? "border-[#F59E0B]/30 bg-[#F59E0B]/5"
                              : "border-[#E2E8F0]"
                      }`}
                    >
                      {st === "approved" ? (
                        <CheckCircle2 className="h-5 w-5 text-[#22C55E]" />
                      ) : st === "rejected" ? (
                        <XCircle className="h-5 w-5 text-[#EF4444]" />
                      ) : st === "changes_requested" ? (
                        <MessageSquareWarning className="h-5 w-5 text-[#F59E0B]" />
                      ) : (
                        <Clock className="h-5 w-5 text-[#94A3B8]" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-[#0F172A]">{d.title}</p>
                        {d.approvalNote && (
                          <p className="text-xs italic text-[#64748B]">“{d.approvalNote}”</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Comments */}
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-xl">
              <h2 className="mb-4 text-base font-semibold text-[#0F172A]">Leave feedback</h2>
              {(comments ?? []).length > 0 && (
                <div className="mb-4 space-y-3">
                  {(comments ?? []).map((c: any) => (
                    <div key={c._id} className="rounded-lg bg-[#F8FAFC] px-4 py-3">
                      <p className="text-xs font-semibold text-[#6366F1]">{c.authorName}</p>
                      <p className="mt-1 text-sm text-[#0F172A]">{c.body}</p>
                      <p className="mt-1 text-[10px] text-[#94A3B8]">
                        {new Date(c.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {posted ? (
                <p className="rounded-lg bg-[#F0FDF4] px-4 py-3 text-center text-sm text-[#16A34A]">
                  Thank you — your feedback was sent to the team.
                </p>
              ) : (
                <form
                  className="space-y-3"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!name.trim() || !comment.trim()) return;
                    await addComment({ linkToken, authorName: name.trim(), body: comment.trim() });
                    setComment("");
                    setPosted(true);
                  }}
                >
                  <Input
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-10"
                  />
                  <Textarea
                    placeholder="Your feedback…"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                  />
                  <Button
                    type="submit"
                    className="w-full bg-[#6366F1] text-white hover:bg-[#4F46E5]"
                    disabled={!name.trim() || !comment.trim()}
                  >
                    Send feedback
                  </Button>
                </form>
              )}
            </div>

            <p className="text-center text-xs text-zinc-400">
              Powered by <span className="font-semibold">Oookea — Digital Atelier</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
