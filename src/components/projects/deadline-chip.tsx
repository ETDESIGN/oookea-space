"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { CalendarClock, BellRing } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useState } from "react";
import { useAuth } from "@/lib/auth";

/**
 * DeadlineChip — live urgency state for a project deadline.
 * calm → amber pulse → red overdue (+ one-click "nudge studio" for clients).
 */
export function DeadlineChip({ deadline }: { deadline?: string }) {
  const [nudged, setNudged] = useState(false);
  const { success } = useToast();
  const sessionToken = typeof window !== "undefined" ? localStorage.getItem("oookea_session") || "" : "";
  const sendMessage = useMutation(api.projects.sendMessage);
  const createThread = useMutation(api.projects.createThread);
  const [busy, setBusy] = useState(false);

  if (!deadline) return null;

  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  const state =
    days < 0
      ? { tone: "text-[#DC2626] bg-[#EF4444]/10 border-[#EF4444]/30", pulse: false, label: `Overdue ${-days}d` }
      : days <= 3
        ? { tone: "text-[#DC2626] bg-[#EF4444]/10 border-[#EF4444]/30", pulse: true, label: `Due in ${days}d` }
        : days <= 14
          ? { tone: "text-[#D97706] bg-[#F59E0B]/10 border-[#F59E0B]/30", pulse: false, label: `Due in ${days}d` }
          : { tone: "text-muted-foreground bg-muted border-transparent", pulse: false, label: `Due ${new Date(deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` };

  const { user } = useAuth();

  const nudge = async () => {
    if (busy || nudged || !user) return;
    setBusy(true);
    try {
      const threadId = await createThread({
        token: sessionToken,
        subject: "Deadline check-in",
        clientId: user.id as any,
      });
      await sendMessage({
        token: sessionToken,
        threadId,
        body: "Friendly nudge — could you share a quick status update on the deadline? Thank you! 🙏",
      });
      setNudged(true);
      success("Nudge sent", "The studio will see your check-in in Messages");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
          state.tone,
          state.pulse && "animate-pulse"
        )}
      >
        <CalendarClock className="h-3 w-3" />
        {state.label}
      </span>
      {days <= 3 && !nudged && (
        <button
          onClick={nudge}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <BellRing className="h-3 w-3" />
          Nudge studio
        </button>
      )}
      {nudged && (
        <span className="text-[11px] text-muted-foreground">Nudged ✓</span>
      )}
    </div>
  );
}
