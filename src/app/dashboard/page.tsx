"use client";

import { ProtectedRoute } from "@/lib/auth";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { QuickActions } from "@/components/dashboard/quick-actions";
import {
  FolderKanban,
  FileText,
  MessageSquare,
  HardDrive,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();

  const firstName = user?.name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          {/* Welcome */}
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">
              {greeting}, {firstName} 👋
            </h1>
            <p className="mt-1 text-[#64748B]">
              Here&apos;s what&apos;s happening with your projects today.
            </p>
          </div>

          {/* Stat Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Active Projects"
              value={4}
              icon={FolderKanban}
              color="bg-[#6366F1]/10 text-[#6366F1]"
              trend={{ value: 12, positive: true }}
            />
            <StatCard
              title="Pending Invoices"
              value={2}
              icon={FileText}
              color="bg-[#F59E0B]/10 text-[#F59E0B]"
              description="$4,200.00 outstanding"
            />
            <StatCard
              title="Unread Messages"
              value={5}
              icon={MessageSquare}
              color="bg-[#8B5CF6]/10 text-[#8B5CF6]"
              trend={{ value: 3, positive: false }}
            />
            <StatCard
              title="Storage Used"
              value="68%"
              icon={HardDrive}
              color="bg-[#22C55E]/10 text-[#22C55E]"
              description="6.8 GB of 10 GB"
            />
          </div>

          {/* Activity + Quick Actions */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ActivityFeed />
            </div>
            <div>
              <QuickActions />
            </div>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
