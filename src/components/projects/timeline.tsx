"use client";

import { CheckCircle2, Circle, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ProjectTimeline — Gantt-inspired phase timeline.
 * Deliverables become a horizontal track of sequential phases with
 * status-aware segments. Progress is read directly from approval states.
 */

type Phase = {
  _id: string;
  title: string;
  order: number;
  approvalStatus?: "pending" | "approved" | "rejected" | "changes_requested";
  completed: boolean;
};

const PHASE_STYLES = {
  approved: "bg-gradient-to-b from-[#22C55E] to-[#16A34A] border-[#22C55E]",
  rejected: "bg-gradient-to-b from-[#EF4444] to-[#DC2626] border-[#EF4444]",
  changes_requested: "bg-gradient-to-b from-[#F59E0B] to-[#D97706] border-[#F59E0B]",
  pending: "bg-muted border-border",
} as const;

export function ProjectTimeline({
  phases,
  startDate,
  deadline,
}: {
  phases: Phase[];
  startDate?: string;
  deadline?: string;
}) {
  const sorted = [...phases].sort((a, b) => a.order - b.order);
  if (sorted.length === 0) return null;

  const approved = sorted.filter((p) => p.approvalStatus === "approved" || (p.completed && !p.approvalStatus)).length;
  const pct = Math.round((approved / sorted.length) * 100);

  const fmt = (d?: string) =>
    d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";

  return (
    <div className="space-y-4">
      {/* ── Progress track ─────────────────────────────────────── */}
      <div className="relative">
        {/* Base rail */}
        <div className="absolute left-0 right-0 top-1.5 h-3 overflow-hidden rounded-full bg-muted" />
        {/* Fill */}
        <div
          className="absolute left-0 top-1.5 h-3 rounded-full bg-gradient-to-r from-[#6366F1] to-[#22C55E] transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
        {/* Phase markers */}
        <div className="relative flex justify-between">
          {sorted.map((p, i) => {
            const st = p.approvalStatus ?? (p.completed ? "approved" : "pending");
            const reached = i <= Math.floor((pct / 100) * sorted.length) - (pct === 100 ? 0 : 1) || st === "approved";
            return (
              <div key={p._id} className="flex flex-col items-center" style={{ width: `${100 / sorted.length}%` }}>
                <div
                  className={cn(
                    "z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-card shadow-sm",
                    st === "approved" && "border-[#22C55E]",
                    st === "rejected" && "border-[#EF4444]",
                    st === "changes_requested" && "border-[#F59E0B]",
                    st === "pending" && (reached ? "border-[#6366F1]" : "border-border")
                  )}
                >
                  {st === "approved" ? (
                    <CheckCircle2 className="h-4 w-4 text-[#22C55E]" />
                  ) : st === "rejected" ? (
                    <XCircle className="h-4 w-4 text-[#EF4444]" />
                  ) : st === "changes_requested" ? (
                    <Clock className="h-4 w-4 text-[#F59E0B]" />
                  ) : (
                    <Circle className={cn("h-3 w-3", reached ? "text-[#6366F1]" : "text-muted-foreground")} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {/* Labels */}
        <div className="mt-2 flex justify-between">
          {sorted.map((p) => (
            <div key={p._id} className="flex flex-col items-center px-1 text-center" style={{ width: `${100 / sorted.length}%` }}>
              <span
                className={cn(
                  "line-clamp-2 text-[11px] leading-tight",
                  p.approvalStatus === "approved" || p.completed
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {p.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Meta row ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
        <span>Start {fmt(startDate)}</span>
        <span className="font-semibold text-foreground">{pct}% approved</span>
        <span>Deadline {fmt(deadline)}</span>
      </div>
    </div>
  );
}
