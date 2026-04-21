"use client";

import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/lib/auth";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronRight, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

type ModuleStatus = "Active" | "Beta" | "Coming Soon";

const categoryAccents: Record<string, { accentBg: string; accentText: string; icon: string }> = {
  "AI Workflow": { accentBg: "bg-violet-50", accentText: "text-violet-700", icon: "🤖" },
  "Sourcing": { accentBg: "bg-blue-50", accentText: "text-blue-700", icon: "🔍" },
  "Marketing": { accentBg: "bg-indigo-50", accentText: "text-indigo-700", icon: "📊" },
  "Analytics": { accentBg: "bg-emerald-50", accentText: "text-emerald-700", icon: "📈" },
  "Integration": { accentBg: "bg-amber-50", accentText: "text-amber-700", icon: "⚙️" },
};

const defaultAccent = { accentBg: "bg-slate-50", accentText: "text-slate-700", icon: "📦" };

const statusStyles: Record<ModuleStatus, string> = {
  Active: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Beta: "bg-amber-50 text-amber-700 border border-amber-200",
  "Coming Soon": "bg-slate-50 text-slate-500 border border-slate-200",
};

export default function ModuleDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const slug = params.slug;

  const modules = useQuery(
    api.projects.listModules,
    user?.id ? { clientId: user.id as Id<"users"> } : "skip"
  );

  const mod = modules?.find((m) => m.slug === slug);

  if (modules === undefined) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#6366F1]" />
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  if (!mod) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-lg font-medium text-[#0F172A]">Module not found</p>
            <Link href="/modules" className="mt-2 text-sm text-[#6366F1] hover:underline">
              Back to Modules
            </Link>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  const accent = categoryAccents[mod.category] || defaultAccent;
  const status: ModuleStatus = mod.enabled ? "Active" : "Coming Soon";

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-[#64748B]">
            <Link
              href="/modules"
              className="transition-colors hover:text-[#6366F1]"
            >
              Modules
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-[#0F172A]">{mod.title}</span>
          </nav>

          {/* Module Info Card */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${accent.accentBg} text-3xl`}
                >
                  {accent.icon}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-[#0F172A]">
                      {mod.title}
                    </h1>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[status]}`}
                    >
                      {status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[#64748B]">
                    {mod.description}
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                className="shrink-0 border-[#E2E8F0]"
                onClick={() => router.push("/modules")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Modules
              </Button>
            </div>

            {/* Long Description */}
            <div className="mt-6 rounded-lg bg-[#F8FAFC] p-4">
              <p className="text-sm leading-relaxed text-[#334155]">
                {mod.description}
              </p>
            </div>
          </div>

          {/* Module iframe Placeholder */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-3">
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-[#94A3B8]" />
                <span className="text-sm font-medium text-[#0F172A]">
                  Module Workspace
                </span>
              </div>
              <span className="text-xs text-[#94A3B8]">
                {status === "Coming Soon"
                  ? "Not available yet"
                  : "Embedded view"}
              </span>
            </div>
            <div className="flex h-[480px] items-center justify-center bg-[#F8FAFC]">
              <div className="flex flex-col items-center gap-3 text-center">
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl ${accent.accentBg} text-3xl`}
                >
                  {accent.icon}
                </div>
                <p className="text-sm font-medium text-[#64748B]">
                  Module iframe will load here
                </p>
                <p className="text-xs text-[#94A3B8]">
                  The {mod.title} interface will be embedded in this area.
                </p>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
