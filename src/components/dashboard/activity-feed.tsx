import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MessageSquare,
  Upload,
  CheckCircle2,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import type { ActivityItem } from "@/types";

const activityIcons: Record<ActivityItem["type"], LucideIcon> = {
  comment: MessageSquare,
  upload: Upload,
  milestone: CheckCircle2,
  update: RefreshCw,
};

const activityColors: Record<ActivityItem["type"], string> = {
  comment: "bg-[#6366F1]/10 text-[#6366F1]",
  upload: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
  milestone: "bg-[#22C55E]/10 text-[#22C55E]",
  update: "bg-[#F59E0B]/10 text-[#F59E0B]",
};

function formatTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const mockActivity: ActivityItem[] = [
  {
    id: "1",
    message: 'New deliverable uploaded for "Brand Redesign" project',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    user: "Sarah Chen",
    type: "upload",
  },
  {
    id: "2",
    message: "Invoice #INV-2024-018 has been marked as paid",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    user: "System",
    type: "update",
  },
  {
    id: "3",
    message: 'Milestone reached: Phase 2 of "E-commerce Platform" complete',
    timestamp: new Date(Date.now() - 18000000).toISOString(),
    user: "Alex Rivera",
    type: "milestone",
  },
  {
    id: "4",
    message: "New comment on Website Wireframes deliverable",
    timestamp: new Date(Date.now() - 43200000).toISOString(),
    user: "Jordan Lee",
    type: "comment",
  },
  {
    id: "5",
    message: "Project proposal for Mobile App has been approved",
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    user: "Sarah Chen",
    type: "milestone",
  },
];

export function ActivityFeed() {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-base font-semibold text-[#0F172A]">
        Recent Activity
      </h3>
      <div className="space-y-4">
        {mockActivity.map((item) => {
          const Icon = activityIcons[item.type];
          return (
            <div key={item.id} className="flex items-start gap-3">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${activityColors[item.type]}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[#0F172A] leading-snug">
                  {item.message}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs text-[#94A3B8]">
                  {item.user && <span>{item.user}</span>}
                  {item.user && <span>·</span>}
                  <span>{formatTimeAgo(item.timestamp)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
