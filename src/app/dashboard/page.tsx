"use client";

import { ProtectedRoute, useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { FolderKanban, FileText, CheckCircle2 } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const clientId = isAdmin ? undefined : (user?.id as Id<"users"> | undefined);

  const projects = useQuery(
    api.projects.listProjects,
    clientId ? { clientId } : {}
  );
  const invoices = useQuery(
    api.projects.listInvoices,
    clientId ? { clientId } : {}
  );
  const threads = useQuery(
    api.projects.listThreads,
    clientId ? { clientId } : {}
  );

  const activeProjects = projects?.filter((p) => p.status === "active").length ?? 0;
  const pendingInvoices = invoices?.filter((i) => i.status === "sent" || i.status === "overdue") ?? [];
  const outstandingTotal = pendingInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const firstName = user?.name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  if (projects === undefined || invoices === undefined) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {greeting}, {firstName} 👋
            </h1>
            <p className="mt-1 text-muted-foreground">
              Here&apos;s what&apos;s happening with your projects today.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Active Projects"
              value={activeProjects}
              icon={FolderKanban}
              color="bg-primary/10 text-primary"
            />
            <StatCard
              title="Pending Invoices"
              value={pendingInvoices.length}
              icon={FileText}
              color="bg-[#F59E0B]/10 text-[#F59E0B]"
              description={`$${outstandingTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })} outstanding`}
            />
            <StatCard
              title="Completed Projects"
              value={projects?.filter((p) => p.status === "completed").length ?? 0}
              icon={CheckCircle2}
              color="bg-[#22C55E]/10 text-[#22C55E]"
            />
          </div>

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
