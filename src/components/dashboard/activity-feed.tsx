"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MessageSquare,
  Upload,
  CheckCircle2,
  RefreshCw,
  FileText,
  type LucideIcon,
} from "lucide-react";
import type { ActivityItem } from "@/types";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "@/lib/auth";

const activityIcons: Record<string, LucideIcon> = {
  comment: MessageSquare,
  upload: Upload,
  milestone: CheckCircle2,
  update: RefreshCw,
  invoice: FileText,
};

const activityColors: Record<string, string> = {
  comment: "bg-primary/10 text-primary",
  upload: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
  milestone: "bg-[#22C55E]/10 text-[#22C55E]",
  update: "bg-[#F59E0B]/10 text-[#F59E0B]",
  invoice: "bg-[#EC4899]/10 text-[#EC4899]",
};

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ActivityFeed() {
    const { user } = useAuth();
  const clientId = user?.role === "admin" ? undefined : (user?.id as Id<"users">);
  const sessionToken = typeof window !== "undefined" ? localStorage.getItem("oookea_session") || "" : "";
  const activityArgs = clientId
    ? { token: sessionToken, clientId, limit: 5 }
    : { token: sessionToken, limit: 5 };
  const activity = useQuery(api.projects.listActivity, sessionToken ? activityArgs : "skip");

  if (activity === undefined) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-foreground">
          Recent Activity
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      </div>
    );
  }

  if (activity.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-foreground">
          Recent Activity
        </h3>
        <p className="text-sm text-muted-foreground text-center py-8">No recent activity.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-base font-semibold text-foreground">
        Recent Activity
      </h3>
      <div className="space-y-4">
        {activity.map((item) => {
          const Icon = activityIcons[item.type] || activityIcons.update;
          return (
            <div key={item._id} className="flex items-start gap-3">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${activityColors[item.type] || activityColors.update}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground leading-snug">
                  {item.message}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatTimeAgo(item.createdAt)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
