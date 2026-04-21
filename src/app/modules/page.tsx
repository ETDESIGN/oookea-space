"use client";

import { ProtectedRoute } from "@/lib/auth";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

type ModuleStatus = "Active" | "Beta" | "Coming Soon";

interface ModuleDisplay {
  id: string;
  slug: string;
  icon: string;
  title: string;
  description: string;
  status: ModuleStatus;
  enabled: boolean;
  accentBg: string;
  accentBorder: string;
  accentText: string;
}

const categoryAccents: Record<string, { accentBg: string; accentBorder: string; accentText: string; icon: string }> = {
  "AI Workflow": { accentBg: "bg-violet-50", accentBorder: "border-violet-200", accentText: "text-violet-700", icon: "🤖" },
  "Sourcing": { accentBg: "bg-blue-50", accentBorder: "border-blue-200", accentText: "text-blue-700", icon: "🔍" },
  "Marketing": { accentBg: "bg-indigo-50", accentBorder: "border-indigo-200", accentText: "text-indigo-700", icon: "📊" },
  "Analytics": { accentBg: "bg-emerald-50", accentBorder: "border-emerald-200", accentText: "text-emerald-700", icon: "📈" },
  "Integration": { accentBg: "bg-amber-50", accentBorder: "border-amber-200", accentText: "text-amber-700", icon: "⚙️" },
};

const defaultAccent = { accentBg: "bg-slate-50", accentBorder: "border-slate-200", accentText: "text-slate-700", icon: "📦" };

const statusStyles: Record<ModuleStatus, string> = {
  Active: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Beta: "bg-amber-50 text-amber-700 border border-amber-200",
  "Coming Soon": "bg-slate-50 text-slate-500 border border-slate-200",
};

export default function ModulesPage() {
  const { user } = useAuth();

  const modules = useQuery(
    api.projects.listModules,
    user?.id ? { clientId: user.id as Id<"users"> } : "skip"
  );

  if (modules === undefined) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  const displayModules: ModuleDisplay[] = modules.map((m) => {
    const accent = categoryAccents[m.category] || defaultAccent;
    const status: ModuleStatus = m.enabled ? "Active" : "Coming Soon";
    return {
      id: m._id,
      slug: m.slug,
      icon: accent.icon,
      title: m.title,
      description: m.description,
      status,
      enabled: m.enabled,
      accentBg: accent.accentBg,
      accentBorder: accent.accentBorder,
      accentText: accent.accentText,
    };
  });

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">Modules</h1>
            <p className="mt-1 text-muted-foreground">
              Access your client-specific tools and integrated services.
            </p>
          </div>

          {/* Module Grid */}
          {displayModules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                <span className="text-2xl">📦</span>
              </div>
              <p className="text-lg font-medium text-foreground">No modules available</p>
              <p className="mt-1 text-sm text-muted-foreground">Your modules will appear here when assigned.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {displayModules.map((mod) => (
                <div
                  key={mod.id}
                  className={`group relative rounded-xl border ${mod.accentBorder} bg-card p-6 shadow-sm transition-shadow hover:shadow-md`}
                >
                  {/* Status Badge */}
                  <span
                    className={`absolute right-4 top-4 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[mod.status]}`}
                  >
                    {mod.status}
                  </span>

                  {/* Icon */}
                  <div
                    className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${mod.accentBg} text-2xl`}
                  >
                    {mod.icon}
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-semibold text-foreground">
                    {mod.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {mod.description}
                  </p>

                  {/* Launch Button */}
                  <div className="mt-5">
                    {mod.status === "Coming Soon" ? (
                      <Button
                        variant="outline"
                        className={`border-border text-muted-foreground cursor-not-allowed`}
                        disabled
                      >
                        Coming Soon
                      </Button>
                    ) : (
                      <Link href={`/modules/${mod.slug}`}>
                        <Button
                          className={`${mod.accentBg} ${mod.accentText} border ${mod.accentBorder} hover:opacity-90 transition-opacity`}
                          variant="outline"
                        >
                          Launch Module
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
