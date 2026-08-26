"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import {
  CheckCircle2,
  MessageSquare,
  Receipt,
  CalendarClock,
  Sparkles,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * ActionQueue — "Needs your attention". Personal, prioritized, one-click
 * rows of everything the user owes a decision on. Empty state is a warm
 * all-clear, not a dead wall.
 */

type Action = {
  kind: "approval" | "message" | "invoice" | "deadline" | "milestone";
  title: string;
  detail: string;
  link: string;
  urgency: "high" | "medium" | "low";
};

const KIND_ICON: Record<Action["kind"], ReactNode> = {
  approval: <CheckCircle2 className="h-4 w-4" />,
  message: <MessageSquare className="h-4 w-4" />,
  invoice: <Receipt className="h-4 w-4" />,
  deadline: <CalendarClock className="h-4 w-4" />,
  milestone: <Sparkles className="h-4 w-4" />,
};

const URGENCY_STYLE = {
  high: "border-l-[#EF4444] bg-[#EF4444]/[0.04]",
  medium: "border-l-[#F59E0B] bg-[#F59E0B]/[0.03]",
  low: "border-l-[#22C55E] bg-[#22C55E]/[0.03]",
};

const KIND_TINT = {
  approval: "text-[#16A34A] bg-[#22C55E]/10",
  message: "text-primary bg-primary/10",
  invoice: "text-[#D97706] bg-[#F59E0B]/10",
  deadline: "text-[#DC2626] bg-[#EF4444]/10",
  milestone: "text-[#8B5CF6] bg-[#8B5CF6]/10",
};

export function ActionQueue() {
  const router = useRouter();
  const sessionToken =
    typeof window !== "undefined" ? localStorage.getItem("oookea_session") || "" : "";

  const data = useQuery(
    api.projects.actionQueue,
    sessionToken ? { token: sessionToken } : "skip"
  ) as { actions: Action[]; total: number } | undefined;

  if (data === undefined) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="h-5 w-44 animate-pulse rounded bg-muted" />
        <div className="mt-4 space-y-2.5">
          <div className="h-12 animate-pulse rounded-xl bg-muted" />
          <div className="h-12 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2.5">
          <h3 className="text-base font-semibold text-foreground">Needs your attention</h3>
          {data.total > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
              {data.total}
            </span>
          )}
        </div>
      </div>

      {data.actions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#22C55E]/10">
            <Inbox className="h-5 w-5 text-[#16A34A]" />
          </span>
          <p className="text-sm font-medium text-foreground">You&apos;re all caught up</p>
          <p className="text-xs text-muted-foreground">
            Nothing needs your decision right now — we&apos;ll ping you when it does.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/60">
          {data.actions.map((a, i) => (
            <button
              key={i}
              onClick={() => router.push(a.link)}
              className={cn(
                "flex w-full items-center gap-3 border-l-[3px] px-5 py-3.5 text-left transition-colors hover:bg-muted/60",
                URGENCY_STYLE[a.urgency]
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  KIND_TINT[a.kind]
                )}
              >
                {KIND_ICON[a.kind]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">
                  {a.title}
                </span>
                <span className="block truncate text-xs text-muted-foreground">{a.detail}</span>
              </span>
              <span className="text-muted-foreground/40">→</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
