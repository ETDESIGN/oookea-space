"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/lib/auth";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Upload,
  FileIcon,
  Image as ImageIcon,
  FileText,
  Video,
  Archive,
  Search,
  Download,
  Trash2,
  Grid3X3,
  List,
} from "lucide-react";

type FileType = "all" | "image" | "document" | "video" | "other";

const mockFiles = [
  { id: "1", name: "brand-guidelines-v3.pdf", client: "TechCorp", type: "document" as const, size: "4.2 MB", date: "2026-04-18" },
  { id: "2", name: "homepage-mockup.png", client: "TechCorp", type: "image" as const, size: "2.8 MB", date: "2026-04-17" },
  { id: "3", name: "product-catalog.pdf", client: "GreenLeaf", type: "document" as const, size: "12.1 MB", date: "2026-04-16" },
  { id: "4", name: "logo-dark.svg", client: "BlueWave", type: "image" as const, size: "48 KB", date: "2026-04-15" },
  { id: "5", name: "promotional-video.mp4", client: "TechCorp", type: "video" as const, size: "145 MB", date: "2026-04-14" },
  { id: "6", name: "sourcing-report.xlsx", client: "GreenLeaf", type: "document" as const, size: "890 KB", date: "2026-04-13" },
  { id: "7", name: "team-photo.jpg", client: "BlueWave", type: "image" as const, size: "3.5 MB", date: "2026-04-12" },
  { id: "8", name: "brand-assets.zip", client: "NovaTech", type: "other" as const, size: "256 MB", date: "2026-04-11" },
  { id: "9", name: "ui-wireframes.fig", client: "NovaTech", type: "other" as const, size: "18 MB", date: "2026-04-10" },
  { id: "10", name: "marketing-brief.docx", client: "GreenLeaf", type: "document" as const, size: "1.2 MB", date: "2026-04-09" },
  { id: "11", name: "product-shots.zip", client: "TechCorp", type: "other" as const, size: "340 MB", date: "2026-04-08" },
  { id: "12", name: "app-demo.mp4", client: "BlueWave", type: "video" as const, size: "89 MB", date: "2026-04-07" },
];

const clientColors: Record<string, string> = {
  TechCorp: "bg-[#6366F1]/10 text-[#6366F1]",
  GreenLeaf: "bg-[#22C55E]/10 text-[#22C55E]",
  BlueWave: "bg-[#3B82F6]/10 text-[#3B82F6]",
  NovaTech: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
};

const typeIcons: Record<string, React.ElementType> = {
  image: ImageIcon,
  document: FileText,
  video: Video,
  other: Archive,
};

export default function AdminUploadsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FileType>("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [search, setSearch] = useState("");

  if (user?.role !== "admin") {
    return <ProtectedRoute><AppLayout><div className="flex items-center justify-center py-20"><p className="text-[#64748B]">Access denied.</p></div></AppLayout></ProtectedRoute>;
  }

  const clients = [...new Set(mockFiles.map((f) => f.client))];

  const filtered = mockFiles.filter((f) => {
    const matchesType = filter === "all" || f.type === filter;
    const matchesClient = clientFilter === "all" || f.client === clientFilter;
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase()) || f.client.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesClient && matchesSearch;
  });

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#0F172A]">File Manager</h1>
              <p className="mt-1 text-[#64748B]">Manage files across all client vaults.</p>
            </div>
            <Button className="bg-[#6366F1] hover:bg-[#4F46E5]">
              <Upload className="mr-2 h-4 w-4" />
              Upload Files
            </Button>
          </div>

          {/* Storage Overview */}
          <Card className="border-[#E2E8F0]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#64748B]">Total storage across all clients</p>
                <p className="text-sm font-semibold text-[#0F172A]">12.4 GB used</p>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as FileType)}>
              <TabsList className="bg-[#F1F5F9]">
                <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">All</TabsTrigger>
                <TabsTrigger value="image" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Images</TabsTrigger>
                <TabsTrigger value="document" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Documents</TabsTrigger>
                <TabsTrigger value="video" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Videos</TabsTrigger>
                <TabsTrigger value="other" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Other</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-3">
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="h-9 rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm text-[#0F172A] focus:border-[#6366F1]"
              >
                <option value="all">All Clients</option>
                {clients.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                <Input placeholder="Search files…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-56 pl-9 border-[#E2E8F0]" />
              </div>
            </div>
          </div>

          {/* File Grid */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <FileIcon className="h-12 w-12 text-[#94A3B8] mb-4" />
              <p className="text-lg font-medium text-[#0F172A]">No files found</p>
              <p className="text-sm text-[#64748B]">Try adjusting your filters.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((file) => {
                const Icon = typeIcons[file.type] || FileIcon;
                return (
                  <Card key={file.id} className="border-[#E2E8F0] hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex h-24 items-center justify-center rounded-lg bg-[#F8FAFC] mb-3">
                        <Icon className="h-8 w-8 text-[#94A3B8]" />
                      </div>
                      <p className="text-sm font-medium text-[#0F172A] truncate" title={file.name}>{file.name}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] border-0 ${clientColors[file.client] || "bg-[#94A3B8]/10 text-[#94A3B8]"}`}>
                          {file.client}
                        </Badge>
                        <span className="text-[10px] text-[#94A3B8]">{file.size}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[10px] text-[#94A3B8]">
                          {new Date(file.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-[#64748B] hover:text-[#6366F1]">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-[#64748B] hover:text-[#EF4444]">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
