"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

type ModuleStatus = "Active" | "Beta" | "Coming Soon";

interface ModuleCard {
  id: string;
  slug: string;
  icon: string;
  title: string;
  description: string;
  status: ModuleStatus;
  accent: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
}

const mockModules: ModuleCard[] = [
  {
    id: "1",
    slug: "ai-marketing-workflow",
    icon: "🤖",
    title: "AI Marketing Workflow",
    description:
      "Automate your marketing pipeline with AI-driven content generation, campaign scheduling, and performance analytics.",
    status: "Active",
    accent: "violet",
    accentBg: "bg-violet-50",
    accentBorder: "border-violet-200",
    accentText: "text-violet-700",
  },
  {
    id: "2",
    slug: "product-sourcing",
    icon: "🔍",
    title: "Product Sourcing",
    description:
      "Discover and evaluate suppliers globally with intelligent search, comparison tools, and automated RFQ management.",
    status: "Active",
    accent: "blue",
    accentBg: "bg-blue-50",
    accentBorder: "border-blue-200",
    accentText: "text-blue-700",
  },
  {
    id: "3",
    slug: "openclaw-ai-agent",
    icon: "🦞",
    title: "OpenClaw AI Agent",
    description:
      "Your custom AI agent for autonomous business operations — from customer support to data analysis and workflow orchestration.",
    status: "Beta",
    accent: "indigo",
    accentBg: "bg-indigo-50",
    accentBorder: "border-indigo-200",
    accentText: "text-indigo-700",
  },
  {
    id: "4",
    slug: "custom-integration",
    icon: "⚙️",
    title: "Custom Integration",
    description:
      "Tailor-made integrations connecting your existing tools, CRM, ERP, and third-party services into one seamless workflow.",
    status: "Coming Soon",
    accent: "amber",
    accentBg: "bg-amber-50",
    accentBorder: "border-amber-200",
    accentText: "text-amber-700",
  },
];

const statusStyles: Record<ModuleStatus, string> = {
  Active: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Beta: "bg-amber-50 text-amber-700 border border-amber-200",
  "Coming Soon": "bg-slate-50 text-slate-500 border border-slate-200",
};

export default function ModulesPage() {
  const [modules] = useState<ModuleCard[]>(mockModules);

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">Modules</h1>
            <p className="mt-1 text-[#64748B]">
              Access your client-specific tools and integrated services.
            </p>
          </div>

          {/* Module Grid */}
          <div className="grid gap-5 sm:grid-cols-2">
            {modules.map((mod) => (
              <div
                key={mod.id}
                className={`group relative rounded-xl border ${mod.accentBorder} bg-white p-6 shadow-sm transition-shadow hover:shadow-md`}
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
                <h3 className="text-lg font-semibold text-[#0F172A]">
                  {mod.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
                  {mod.description}
                </p>

                {/* Launch Button */}
                <div className="mt-5">
                  {mod.status === "Coming Soon" ? (
                    <Button
                      variant="outline"
                      className={`border-[#E2E8F0] text-[#94A3B8] cursor-not-allowed`}
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
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
