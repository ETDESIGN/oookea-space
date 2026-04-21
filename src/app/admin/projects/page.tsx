"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Plus,
  FolderKanban,
  CheckCircle2,
  PauseCircle,
  LayoutGrid,
  Calendar,
  Search,
} from "lucide-react";
import type { Project, ProjectStatus } from "@/types";

// ─── Mock Clients ───────────────────────────────────────────────
const clients = [
  "TechCorp",
  "GreenLeaf",
  "BlueWave",
  "Acme Corp",
  "Globex Inc",
  "Soylent Corp",
  "Initech",
  "Umbrella Corp",
];

// ─── Mock Data ──────────────────────────────────────────────────
const initialProjects: Project[] = [
  {
    id: "1",
    slug: "techcorp-website-redesign",
    title: "Website Redesign",
    description: "Complete redesign of the corporate website with modern UI/UX",
    status: "active",
    progress: 75,
    thumbnail: "",
    category: "Website",
    startDate: "2026-01-15",
    deadline: "2026-05-15",
    client: "TechCorp",
    brief: "Full redesign of the corporate website.",
    deliverables: [],
    activity: [],
    tags: ["design", "development"],
  },
  {
    id: "2",
    slug: "greenleaf-brand-identity",
    title: "Brand Identity Package",
    description: "Logo, color palette, typography system, and brand guidelines",
    status: "completed",
    progress: 100,
    thumbnail: "",
    category: "Branding",
    startDate: "2025-11-01",
    deadline: "2026-02-28",
    client: "GreenLeaf",
    brief: "Complete brand identity package.",
    deliverables: [],
    activity: [],
    tags: ["branding"],
  },
  {
    id: "3",
    slug: "bluewave-ai-workflow",
    title: "AI Marketing Workflow",
    description: "Custom AI-powered marketing automation and content generation system",
    status: "active",
    progress: 40,
    thumbnail: "",
    category: "AI Workflow",
    startDate: "2026-03-01",
    deadline: "2026-06-30",
    client: "BlueWave",
    brief: "AI-driven marketing workflows.",
    deliverables: [],
    activity: [],
    tags: ["ai", "marketing"],
  },
  {
    id: "4",
    slug: "techcorp-sourcing-platform",
    title: "Product Sourcing Platform",
    description: "Supplier discovery and product sourcing dashboard",
    status: "on-hold",
    progress: 20,
    thumbnail: "",
    category: "Sourcing",
    startDate: "2026-02-15",
    deadline: "2026-07-01",
    client: "TechCorp",
    brief: "Custom sourcing platform for discovering suppliers.",
    deliverables: [],
    activity: [],
    tags: ["sourcing"],
  },
  {
    id: "5",
    slug: "acme-ecommerce-build",
    title: "E-Commerce Platform",
    description: "Full-stack e-commerce platform with payment integration",
    status: "active",
    progress: 55,
    thumbnail: "",
    category: "Website",
    startDate: "2026-02-01",
    deadline: "2026-06-15",
    client: "Acme Corp",
    brief: "Full e-commerce build with Stripe integration.",
    deliverables: [],
    activity: [],
    tags: ["development", "ecommerce"],
  },
  {
    id: "6",
    slug: "greenleaf-packaging-design",
    title: "Sustainable Packaging Design",
    description: "Eco-friendly packaging design for new product line",
    status: "completed",
    progress: 100,
    thumbnail: "",
    category: "Branding",
    startDate: "2025-10-01",
    deadline: "2026-01-31",
    client: "GreenLeaf",
    brief: "Sustainable packaging design for product line.",
    deliverables: [],
    activity: [],
    tags: ["design", "packaging"],
  },
  {
    id: "7",
    slug: "globex-ai-chatbot",
    title: "Customer Support AI Chatbot",
    description: "Intelligent chatbot for customer support automation",
    status: "active",
    progress: 65,
    thumbnail: "",
    category: "AI Workflow",
    startDate: "2026-03-15",
    deadline: "2026-07-30",
    client: "Globex Inc",
    brief: "AI chatbot for customer support.",
    deliverables: [],
    activity: [],
    tags: ["ai", "chatbot"],
  },
  {
    id: "8",
    slug: "bluewave-mobile-app",
    title: "Mobile App Development",
    description: "Cross-platform mobile app for field operations",
    status: "on-hold",
    progress: 30,
    thumbnail: "",
    category: "Website",
    startDate: "2026-01-10",
    deadline: "2026-05-30",
    client: "BlueWave",
    brief: "Cross-platform mobile app.",
    deliverables: [],
    activity: [],
    tags: ["mobile", "development"],
  },
  {
    id: "9",
    slug: "soylent-brand-refresh",
    title: "Brand Refresh Campaign",
    description: "Complete brand refresh including digital and print assets",
    status: "completed",
    progress: 100,
    thumbnail: "",
    category: "Branding",
    startDate: "2025-09-01",
    deadline: "2026-01-15",
    client: "Soylent Corp",
    brief: "Brand refresh across all touchpoints.",
    deliverables: [],
    activity: [],
    tags: ["branding", "design"],
  },
  {
    id: "10",
    slug: "initech-supplier-portal",
    title: "Supplier Portal",
    description: "Vendor management and procurement portal",
    status: "active",
    progress: 50,
    thumbnail: "",
    category: "Sourcing",
    startDate: "2026-04-01",
    deadline: "2026-08-31",
    client: "Initech",
    brief: "Supplier management portal.",
    deliverables: [],
    activity: [],
    tags: ["sourcing", "portal"],
  },
];

// ─── Helpers ────────────────────────────────────────────────────
const statusConfig: Record<ProjectStatus, { label: string; color: string; icon: typeof FolderKanban }> = {
  active: { label: "Active", color: "bg-[#22C55E]/10 text-[#22C55E]", icon: FolderKanban },
  completed: { label: "Completed", color: "bg-[#6366F1]/10 text-[#6366F1]", icon: CheckCircle2 },
  "on-hold": { label: "On Hold", color: "bg-[#F59E0B]/10 text-[#F59E0B]", icon: PauseCircle },
  draft: { label: "Draft", color: "bg-[#94A3B8]/10 text-[#94A3B8]", icon: FolderKanban },
};

const categoryColors: Record<string, string> = {
  Website: "bg-blue-50 text-blue-700",
  Branding: "bg-purple-50 text-purple-700",
  "AI Workflow": "bg-emerald-50 text-emerald-700",
  Sourcing: "bg-amber-50 text-amber-700",
  Other: "bg-gray-50 text-gray-700",
};

const categoryIcons: Record<string, string> = {
  Website: "🌐",
  Branding: "🎨",
  "AI Workflow": "🤖",
  Sourcing: "🔍",
  Other: "⚙️",
};

const statusFilters: { label: string; value: string }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "On Hold", value: "on-hold" },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Create Project Dialog ──────────────────────────────────────
function CreateProjectDialog({ onCreated }: { onCreated: (project: Project) => void }) {
  const [open, setOpen] = useState(false);
  const [client, setClient] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Website");
  const [deadline, setDeadline] = useState("");

  const handleSubmit = () => {
    if (!client || !title || !category) return;

    const newProject: Project = {
      id: crypto.randomUUID(),
      slug: title.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now(),
      title,
      description,
      status: "active",
      progress: 0,
      thumbnail: "",
      category,
      startDate: new Date().toISOString().split("T")[0],
      deadline: deadline || undefined,
      client,
      brief: description,
      deliverables: [],
      activity: [],
      tags: [],
    };

    onCreated(newProject);
    setOpen(false);
    setClient("");
    setTitle("");
    setDescription("");
    setCategory("Website");
    setDeadline("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="gap-2 bg-[#6366F1] hover:bg-[#4F46E5]">
            <Plus className="h-4 w-4" />
            Create Project
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>Set up a new project for a client.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Client */}
          <div className="grid gap-2">
            <Label htmlFor="project-client">Client</Label>
            <select
              id="project-client"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1]/50"
            >
              <option value="">Select client…</option>
              {clients.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div className="grid gap-2">
            <Label htmlFor="project-title">Title</Label>
            <Input
              id="project-title"
              placeholder="e.g. Website Redesign"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-[#E2E8F0]"
            />
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="project-description">Description</Label>
            <textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief project description…"
              rows={3}
              className="flex w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm shadow-sm placeholder:text-[#94A3B8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1]/50"
            />
          </div>

          {/* Category + Deadline */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="project-category">Category</Label>
              <select
                id="project-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1]/50"
              >
                <option value="Website">Website</option>
                <option value="Branding">Branding</option>
                <option value="AI Workflow">AI Workflow</option>
                <option value="Sourcing">Sourcing</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-deadline">Deadline</Label>
              <Input
                id="project-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="border-[#E2E8F0]"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          <Button
            className="bg-[#6366F1] hover:bg-[#4F46E5]"
            onClick={handleSubmit}
            disabled={!client || !title}
          >
            Create Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Project Card (Admin) ───────────────────────────────────────
function AdminProjectCard({ project }: { project: Project }) {
  const status = statusConfig[project.status];
  const catColor = categoryColors[project.category] || categoryColors.Other;

  return (
    <Card className="group border-[#E2E8F0] bg-white shadow-sm transition-all hover:shadow-lg hover:border-[#6366F1]/30 hover:-translate-y-0.5">
      {/* Thumbnail */}
      <div className="relative h-36 overflow-hidden rounded-t-xl bg-gradient-to-br from-[#6366F1]/20 via-[#8B5CF6]/10 to-[#EEF2FF]">
        <div className="flex h-full items-center justify-center">
          <span className="text-4xl opacity-30">
            {categoryIcons[project.category] || "⚙️"}
          </span>
        </div>
        {/* Status Badge */}
        <Badge className={`absolute right-3 top-3 border-0 text-xs font-medium ${status.color}`}>
          {status.label}
        </Badge>
      </div>

      <CardContent className="p-4">
        {/* Title + Client */}
        <div className="space-y-1">
          <h3 className="truncate text-sm font-semibold text-[#0F172A] group-hover:text-[#6366F1] transition-colors">
            {project.title}
          </h3>
          <p className="text-xs font-medium text-[#6366F1]">
            {project.client}
          </p>
        </div>

        {/* Category Badge */}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium ${catColor}`}>
            {project.category}
          </span>
        </div>

        {/* Progress */}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#64748B]">Progress</span>
            <span className="font-medium text-[#0F172A]">{project.progress}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[#F1F5F9]">
            <div
              className="h-full rounded-full bg-[#6366F1] transition-all"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>

        {/* Deadline */}
        {project.deadline && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-[#94A3B8]">
            <Calendar className="h-3.5 w-3.5" />
            <span>Due {formatDate(project.deadline)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ──────────────────────────────────────────────────
export default function AdminProjectsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [filter, setFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");

  // Admin guard
  useEffect(() => {
    if (user && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  if (!user || user.role !== "admin") {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#6366F1] border-t-transparent" />
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  // Stats
  const active = projects.filter((p) => p.status === "active").length;
  const completed = projects.filter((p) => p.status === "completed").length;
  const onHold = projects.filter((p) => p.status === "on-hold").length;
  const total = projects.length;

  const statusCounts: Record<string, number> = {
    all: total,
    active,
    completed,
    "on-hold": onHold,
  };

  // Filtered projects
  const filtered = projects.filter((p) => {
    const matchesStatus = filter === "all" || p.status === filter;
    const matchesClient = clientFilter === "all" || p.client === clientFilter;
    return matchesStatus && matchesClient;
  });

  const handleCreated = (project: Project) => {
    setProjects((prev) => [project, ...prev]);
  };

  // Unique clients from projects
  const uniqueClients = Array.from(new Set(projects.map((p) => p.client))).sort();

  const stats = [
    { label: "Active", value: active, color: "text-[#22C55E]", bg: "bg-[#22C55E]/10" },
    { label: "Completed", value: completed, color: "text-[#6366F1]", bg: "bg-[#6366F1]/10" },
    { label: "On Hold", value: onHold, color: "text-[#F59E0B]", bg: "bg-[#F59E0B]/10" },
    { label: "Total", value: total, color: "text-[#0F172A]", bg: "bg-[#F1F5F9]" },
  ];

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#0F172A]">Project Management</h1>
              <p className="mt-1 text-[#64748B]">
                Manage all client projects across your portfolio.
              </p>
            </div>
            <CreateProjectDialog onCreated={handleCreated} />
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.label} className="border-[#E2E8F0] bg-white shadow-sm">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stat.bg}`}>
                    <LayoutGrid className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#64748B]">{stat.label}</p>
                    <p className="text-2xl font-bold text-[#0F172A]">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
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
                    <span className="ml-1.5 text-xs text-[#94A3B8]">
                      {statusCounts[s.value]}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Client Filter Dropdown */}
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="flex h-9 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1]/50"
            >
              <option value="all">All Clients</option>
              {uniqueClients.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Projects Grid */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F1F5F9]">
                <FolderKanban className="h-8 w-8 text-[#94A3B8]" />
              </div>
              <p className="text-lg font-medium text-[#0F172A]">No projects found</p>
              <p className="mt-1 text-sm text-[#64748B]">Try adjusting your filters.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((project) => (
                <AdminProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
