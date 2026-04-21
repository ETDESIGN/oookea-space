"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/lib/auth";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { FileCard } from "@/components/files/file-card";
import { UploadZone } from "@/components/files/upload-zone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  LayoutGrid,
  List,
  HardDrive,
  Loader2,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import type { FileItem, FileType } from "@/types";

const fileTabs: { label: string; value: string; filter?: FileType }[] = [
  { label: "All Files", value: "all" },
  { label: "Images", value: "image", filter: "image" },
  { label: "Documents", value: "document", filter: "document" },
  { label: "Videos", value: "video", filter: "video" },
  { label: "Other", value: "other", filter: "other" },
];

function formatStorage(bytes: number): string {
  if (bytes >= 1_073_741_824) return (bytes / 1_073_741_824).toFixed(1) + " GB";
  return (bytes / 1_048_576).toFixed(0) + " MB";
}

const STORAGE_USED = 250 * 1_048_576; // 250 MB
const STORAGE_TOTAL = 500 * 1_048_576; // 500 MB

export default function FilesPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [localFiles, setLocalFiles] = useState<FileItem[]>([]);

  const isAdmin = user?.role === "admin";
  const clientId = !isAdmin ? (user?.id as Id<"users">) : undefined;

  const convexFiles = useQuery(
    api.projects.listFiles,
    clientId ? { clientId } : (isAdmin ? {} : "skip")
  );

  // Merge Convex files with locally uploaded files
  const allFiles: FileItem[] = [
    ...(convexFiles?.map((f) => ({
      id: f._id,
      name: f.name,
      type: f.type as FileType,
      size: f.size,
      url: "/files/mock",
      thumbnail: undefined,
      uploadedAt: new Date(f.createdAt).toISOString(),
      uploadedBy: user?.name || "Unknown",
      projectSlug: undefined,
      mimeType: f.mimeType,
    })) ?? []),
    ...localFiles,
  ];

  const handleUpload = (uploaded: File[]) => {
    const newFiles: FileItem[] = uploaded.map((f, i) => ({
      id: `upload-${Date.now()}-${i}`,
      name: f.name,
      type: f.type.startsWith("image/")
        ? "image" as FileType
        : f.type.startsWith("video/")
          ? "video" as FileType
          : f.type.includes("pdf") || f.type.includes("document") || f.type.includes("sheet")
            ? "document" as FileType
            : f.type.includes("zip") || f.type.includes("archive")
              ? "archive" as FileType
              : "other" as FileType,
      size: f.size,
      url: URL.createObjectURL(f),
      thumbnail: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined,
      uploadedAt: new Date().toISOString(),
      uploadedBy: user?.name || "You",
      mimeType: f.type,
    }));
    setLocalFiles((prev) => [...newFiles, ...prev]);
  };

  const filtered = allFiles.filter((f) => {
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase());
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "other") {
      return matchesSearch && f.type !== "image" && f.type !== "document" && f.type !== "video";
    }
    return matchesSearch && f.type === activeTab;
  });

  const usedPercent = Math.round((STORAGE_USED / STORAGE_TOTAL) * 100);

  if (convexFiles === undefined) {
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

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">File Vault</h1>
            <p className="mt-1 text-muted-foreground">
              Manage and download all your project files and assets.
            </p>
          </div>

          {/* Storage Usage */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <HardDrive className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Storage</p>
                  <p className="text-xs text-muted-foreground">
                    {formatStorage(STORAGE_USED)} of {formatStorage(STORAGE_TOTAL)} used
                  </p>
                </div>
              </div>
              <p className="text-lg font-semibold text-foreground">{usedPercent}%</p>
            </div>
            <Progress value={usedPercent} className="mt-3 h-2.5 bg-muted" />
          </div>

          {/* Upload Zone */}
          <UploadZone onUpload={handleUpload} />

          {/* Filters */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-muted">
                {fileTabs.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search files…"
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

          {/* Files */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-foreground">No files found</p>
              <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filters.</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((file) => (
                <FileCard key={file.id} file={file} viewMode="grid" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((file) => (
                <FileCard key={file.id} file={file} viewMode="list" />
              ))}
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
