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
  comment: "bg-[#6366F1]/10 text-[#6366F1]",
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
  const activityArgs = clientId ? { clientId, limit: 5 } : { limit: 5 };
  const activity = useQuery(api.projects.listActivity, activityArgs);

  if (activity === undefined) {
    return (
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-[#0F172A]">
          Recent Activity
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E2E8F0] border-t-[#6366F1]" />
        </div>
      </div>
    );
  }

  if (activity.length === 0) {
    return (
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-[#0F172A]">
          Recent Activity
        </h3>
        <p className="text-sm text-[#64748B] text-center py-8">No recent activity.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-base font-semibold text-[#0F172A]">
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
                <p className="text-sm text-[#0F172A] leading-snug">
                  {item.message}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs text-[#94A3B8]">
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
