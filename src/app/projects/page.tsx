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
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import type { Project } from "@/types";

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

  const clientId = user?.role === "admin" ? undefined : (user?.id as Id<"users">);
  const projects = useQuery(api.projects.listProjects, { clientId });

  const projectList = projects ?? [];

  const filtered = projectList.filter((p) => {
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
            <h1 className="text-2xl font-bold text-foreground">Projects</h1>
            <p className="mt-1 text-muted-foreground">
              Track progress on all your active and completed projects.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList className="bg-muted">
                {statusFilters.map((s) => (
                  <TabsTrigger
                    key={s.value}
                    value={s.value}
                    className="data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm"
                  >
                    {s.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search projects…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 w-64 pl-9 border-border bg-card"
                />
              </div>
              <div className="flex rounded-lg border border-border bg-card p-0.5">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`rounded-md p-1.5 ${viewMode === "grid" ? "bg-primary text-white" : "text-muted-foreground"}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`rounded-md p-1.5 ${viewMode === "list" ? "bg-primary text-white" : "text-muted-foreground"}`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Loading */}
          {projects === undefined && (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
            </div>
          )}

          {/* Projects Grid / List */}
          {projects !== undefined && filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-foreground">No projects found</p>
              <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filters.</p>
            </div>
          ) : projects !== undefined && viewMode === "grid" ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((project) => (
                <ProjectCard key={project._id} project={{
                  id: project._id,
                  slug: project.slug,
                  title: project.title,
                  description: project.description,
                  status: project.status as "active" | "completed" | "on-hold" | "draft",
                  progress: project.progress,
                  thumbnail: project.thumbnail,
                  category: project.category,
                  startDate: project.startDate,
                  deadline: project.deadline,
                  client: "",
                  brief: project.brief ?? "",
                  deliverables: [],
                  activity: [],
                  tags: project.tags ?? [],
                }} />
              ))}
            </div>
          ) : projects !== undefined ? (
            <div className="rounded-xl border border-border bg-card">
              {filtered.map((project, i) => (
                <a
                  key={project._id}
                  href={`/projects/${project.slug}`}
                  className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-background ${i > 0 ? "border-t border-border" : ""}`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <span className="text-lg">
                      {project.category === "Website" ? "🌐" :
                       project.category === "Branding" ? "🎨" :
                       project.category === "AI Workflow" ? "🤖" :
                       project.category === "Sourcing" ? "🔍" : "⚙️"}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{project.title}</p>
                    <p className="text-xs text-muted-foreground">{project.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">{project.progress}%</p>
                    <p className="text-xs text-muted-foreground">
                      {project.status === "active" ? "Active" :
                       project.status === "completed" ? "Completed" : "On Hold"}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
