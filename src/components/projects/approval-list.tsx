"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Id } from "../../../convex/_generated/dataModel";
import {
  CheckCircle2,
  Circle,
  XCircle,
  MessageSquareWarning,
  Clock,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ApprovalList — client-facing deliverable approvals.
 * Each deliverable shows its approval state + signature, and the client
 * (or admin on their behalf) can Approve / Request changes / Reject.
 */

type Deliverable = {
  _id: string;
  title: string;
  completed: boolean;
  approvalStatus?: "pending" | "approved" | "rejected" | "changes_requested";
  approvedAt?: number;
  approvalNote?: string;
  approverName?: string;
};

const STATUS_CONFIG = {
  approved: { icon: CheckCircle2, color: "text-[#22C55E]", label: "Approved" },
  rejected: { icon: XCircle, color: "text-[#EF4444]", label: "Rejected" },
  changes_requested: { icon: MessageSquareWarning, color: "text-[#F59E0B]", label: "Changes requested" },
  pending: { icon: Clock, color: "text-[#94A3B8]", label: "Awaiting review" },
} as const;

export function ApprovalList({ deliverables }: { deliverables: Deliverable[] }) {
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const decide = useMutation(api.projects.decideDeliverable);
  const token = typeof window !== "undefined" ? localStorage.getItem("oookea_session") || "" : "";

  const submit = async (
    id: string,
    decision: "approved" | "rejected" | "changes_requested",
    withNote: boolean
  ) => {
    if (withNote && decision !== "approved" && !note.trim()) {
      setNoteFor(id);
      return;
    }
    setBusy(id);
    try {
      await decide({
        token,
        id: id as Id<"deliverables">,
        decision,
        note: withNote ? note.trim() || undefined : undefined,
      });
      setNoteFor(null);
      setNote("");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      {deliverables.map((d) => {
        const status = d.approvalStatus ?? (d.completed ? "approved" : "pending");
        const cfg = STATUS_CONFIG[status];
        const Icon = cfg.icon;
        const isBusy = busy === d._id;

        return (
          <div
            key={d._id}
            className={cn(
              "rounded-xl border p-4 transition-colors",
              status === "approved" ? "border-[#22C55E]/30 bg-[#22C55E]/5" :
              status === "rejected" ? "border-[#EF4444]/30 bg-[#EF4444]/5" :
              status === "changes_requested" ? "border-[#F59E0B]/30 bg-[#F59E0B]/5" :
              "border-border bg-card"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", cfg.color)} />
                <div>
                  <p className={cn("text-sm font-medium", status === "approved" ? "text-foreground" : "text-foreground")}>
                    {d.title}
                  </p>
                  {status !== "pending" && d.approvedAt && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {cfg.label}
                      {d.approverName ? ` by ${d.approverName}` : ""}
                      {" · "}
                      {new Date(d.approvedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {d.approvedAt && Date.now() - d.approvedAt > 0 ? "" : ""}
                    </p>
                  )}
                  {d.approvalNote && (
                    <p className="mt-1.5 rounded-lg bg-muted px-3 py-2 text-xs italic text-muted-foreground">
                      “{d.approvalNote}”
                    </p>
                  )}
                </div>
              </div>

              {/* Decision buttons */}
              <div className="flex shrink-0 items-center gap-1.5">
                {isBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 border-[#22C55E]/40 text-[#16A34A] hover:bg-[#22C55E]/10 hover:text-[#16A34A]"
                      onClick={() => submit(d._id, "approved", false)}
                      disabled={status === "approved"}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 border-[#F59E0B]/40 text-[#D97706] hover:bg-[#F59E0B]/10 hover:text-[#D97706]"
                      onClick={() => {
                        setNoteFor(d._id);
                        setNote("");
                      }}
                    >
                      <MessageSquareWarning className="h-3.5 w-3.5" />
                      Changes
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 border-[#EF4444]/40 text-[#DC2626] hover:bg-[#EF4444]/10 hover:text-[#DC2626]"
                      onClick={() => submit(d._id, "rejected", true)}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Note box (for changes/rejections) */}
            {noteFor === d._id && (
              <div className="mt-3 space-y-2 rounded-lg border border-border bg-background p-3">
                <Textarea
                  placeholder="What should change? (required)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="text-sm"
                />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setNoteFor(null)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={!note.trim() || isBusy}
                    className="bg-primary text-white hover:bg-primary/90"
                    onClick={() => submit(d._id, "changes_requested", true)}
                  >
                    Send feedback
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
