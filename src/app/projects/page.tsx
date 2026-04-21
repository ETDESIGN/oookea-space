"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/lib/auth";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { ProjectCard } from "@/components/projects/project-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, LayoutGrid, List, Plus } from "lucide-react";
import type { Project, ProjectStatus } from "@/types";

const mockProjects: Project[] = [
  {
    id: "1",
    slug: "website-redesign",
    title: "Website Redesign",
    description: "Complete redesign of the corporate website with modern UI/UX",
    status: "active",
    progress: 75,
    thumbnail: "",
    category: "Website",
    startDate: "2026-01-15",
    deadline: "2026-05-15",
    client: "Acme Corp",
    brief: "Full redesign of the corporate website including homepage, about, services, and contact pages.",
    deliverables: [
      { id: "d1", title: "Homepage mockup", completed: true },
      { id: "d2", title: "UI style guide", completed: true },
      { id: "d3", title: "Development", completed: false },
      { id: "d4", title: "QA testing", completed: false },
    ],
    activity: [],
    tags: ["design", "development"],
  },
  {
    id: "2",
    slug: "brand-identity",
    title: "Brand Identity Package",
    description: "Logo, color palette, typography system, and brand guidelines",
    status: "completed",
    progress: 100,
    thumbnail: "",
    category: "Branding",
    startDate: "2025-11-01",
    deadline: "2026-02-28",
    client: "Acme Corp",
    brief: "Complete brand identity including logo variations, color system, typography, and guidelines document.",
    deliverables: [
      { id: "d5", title: "Logo design", completed: true },
      { id: "d6", title: "Brand guidelines PDF", completed: true },
      { id: "d7", title: "Social media kit", completed: true },
    ],
    activity: [],
    tags: ["branding"],
  },
  {
    id: "3",
    slug: "ai-marketing-workflow",
    title: "AI Marketing Workflow",
    description: "Custom AI-powered marketing automation and content generation system",
    status: "active",
    progress: 40,
    thumbnail: "",
    category: "AI Workflow",
    startDate: "2026-03-01",
    deadline: "2026-06-30",
    client: "Acme Corp",
    brief: "Implementation of AI-driven marketing workflows for automated content creation and campaign management.",
    deliverables: [
      { id: "d8", title: "Workflow architecture", completed: true },
      { id: "d9", title: "AI model training", completed: false },
      { id: "d10", title: "Integration testing", completed: false },
    ],
    activity: [],
    tags: ["ai", "marketing"],
  },
  {
    id: "4",
    slug: "product-sourcing",
    title: "Product Sourcing Platform",
    description: "Supplier discovery and product sourcing dashboard",
    status: "on-hold",
    progress: 20,
    thumbnail: "",
    category: "Sourcing",
    startDate: "2026-02-15",
    deadline: "2026-07-01",
    client: "Acme Corp",
    brief: "Custom sourcing platform for discovering and evaluating suppliers globally.",
    deliverables: [
      { id: "d11", title: "Platform architecture", completed: true },
      { id: "d12", title: "Supplier database", completed: false },
      { id: "d13", title: "Search & filters", completed: false },
    ],
    activity: [],
    tags: ["sourcing", "platform"],
  },
  {
    id: "5",
    slug: "openclaw-setup",
    title: "OpenClaw AI Agent Setup",
    description: "Custom AI agent configuration and deployment",
    status: "active",
    progress: 60,
    thumbnail: "",
    category: "AI Setup",
    startDate: "2026-04-01",
    deadline: "2026-05-30",
    client: "Acme Corp",
    brief: "Setup and configuration of OpenClaw AI agent for autonomous business operations.",
    deliverables: [
      { id: "d14", title: "Environment setup", completed: true },
      { id: "d15", title: "Agent configuration", completed: true },
      { id: "d16", title: "Testing & deployment", completed: false },
    ],
    activity: [],
    tags: ["ai", "automation"],
  },
];

const statusFilters: { label: string; value: string }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "On Hold", value: "on-hold" },
];

export default function ProjectsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filtered = mockProjects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || p.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">Projects</h1>
            <p className="mt-1 text-[#64748B]">
              Track progress on all your active and completed projects.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList className="bg-[#F1F5F9]">
                {statusFilters.map((s) => (
                  <TabsTrigger
                    key={s.value}
                    value={s.value}
                    className="data-[state=active]:bg-white data-[state=active]:text-[#6366F1] data-[state=active]:shadow-sm"
                  >
                    {s.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                <Input
                  placeholder="Search projects…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 w-64 pl-9 border-[#E2E8F0] bg-white"
                />
              </div>
              <div className="flex rounded-lg border border-[#E2E8F0] bg-white p-0.5">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`rounded-md p-1.5 ${viewMode === "grid" ? "bg-[#6366F1] text-white" : "text-[#64748B]"}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`rounded-md p-1.5 ${viewMode === "list" ? "bg-[#6366F1] text-white" : "text-[#64748B]"}`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Projects Grid */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F1F5F9]">
                <Search className="h-8 w-8 text-[#94A3B8]" />
              </div>
              <p className="text-lg font-medium text-[#0F172A]">No projects found</p>
              <p className="mt-1 text-sm text-[#64748B]">Try adjusting your search or filters.</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-[#E2E8F0] bg-white">
              {filtered.map((project, i) => (
                <a
                  key={project.id}
                  href={`/projects/${project.slug}`}
                  className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[#F8FAFC] ${i > 0 ? "border-t border-[#E2E8F0]" : ""}`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#6366F1]/10 text-[#6366F1]">
                    <span className="text-lg">
                      {project.category === "Website" ? "🌐" :
                       project.category === "Branding" ? "🎨" :
                       project.category === "AI Workflow" ? "🤖" :
                       project.category === "Sourcing" ? "🔍" : "⚙️"}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[#0F172A]">{project.title}</p>
                    <p className="text-xs text-[#64748B]">{project.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-[#0F172A]">{project.progress}%</p>
                    <p className="text-xs text-[#64748B]">
                      {project.status === "active" ? "Active" :
                       project.status === "completed" ? "Completed" : "On Hold"}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
