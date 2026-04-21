"use client";

import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronRight, ExternalLink } from "lucide-react";
import Link from "next/link";

type ModuleStatus = "Active" | "Beta" | "Coming Soon";

interface ModuleDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  status: ModuleStatus;
  icon: string;
  accentBg: string;
  accentText: string;
  longDescription: string;
}

const moduleLookup: Record<string, ModuleDetail> = {
  "ai-marketing-workflow": {
    id: "1",
    slug: "ai-marketing-workflow",
    title: "AI Marketing Workflow",
    description:
      "Automate your marketing pipeline with AI-driven content generation, campaign scheduling, and performance analytics.",
    status: "Active",
    icon: "🤖",
    accentBg: "bg-violet-50",
    accentText: "text-violet-700",
    longDescription:
      "The AI Marketing Workflow module provides an end-to-end solution for automating your marketing efforts. It leverages advanced language models to generate blog posts, social media content, email campaigns, and ad copy. Built-in scheduling, A/B testing, and real-time analytics help you optimise every campaign for maximum ROI.",
  },
};

const statusStyles: Record<ModuleStatus, string> = {
  Active: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Beta: "bg-amber-50 text-amber-700 border border-amber-200",
  "Coming Soon": "bg-slate-50 text-slate-500 border border-slate-200",
};

export default function ModuleDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;

  const mod: ModuleDetail =
    moduleLookup[slug] ??
    ({
      id: "unknown",
      slug,
      title: slug
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
      description: "Module details are being configured.",
      status: "Coming Soon" as ModuleStatus,
      icon: "📦",
      accentBg: "bg-slate-50",
      accentText: "text-slate-700",
      longDescription:
        "This module is currently being set up. Check back soon for full access.",
    } satisfies ModuleDetail);

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
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${mod.accentBg} text-3xl`}
                >
                  {mod.icon}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-[#0F172A]">
                      {mod.title}
                    </h1>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[mod.status]}`}
                    >
                      {mod.status}
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
                {mod.longDescription}
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
                {mod.status === "Coming Soon"
                  ? "Not available yet"
                  : "Embedded view"}
              </span>
            </div>
            <div className="flex h-[480px] items-center justify-center bg-[#F8FAFC]">
              <div className="flex flex-col items-center gap-3 text-center">
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl ${mod.accentBg} text-3xl`}
                >
                  {mod.icon}
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
