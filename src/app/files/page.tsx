"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/lib/auth";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { FileCard } from "@/components/files/file-card";
import { UploadZone } from "@/components/files/upload-zone";
import { Lightbox, LightboxItem } from "@/components/files/lightbox";
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
import { useQuery, useMutation } from "convex/react";
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

const STORAGE_TOTAL_PLAN = 500 * 1_048_576; // 500 MB plan

function formatStorage(bytes: number): string {
  if (bytes >= 1_073_741_824) return (bytes / 1_073_741_824).toFixed(1) + " GB";
  if (bytes < 1_048_576) return Math.max(1, Math.round(bytes / 1024)) + " KB";
  return (bytes / 1_048_576).toFixed(0) + " MB";
}

export default function FilesPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [uploadingCount, setUploadingCount] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState("");

  const isAdmin = user?.role === "admin";
  const clientId = !isAdmin ? (user?.id as Id<"users">) : undefined;

  const convexFiles = useQuery(
    api.projects.listFiles,
    clientId ? { token: (typeof window !== "undefined" ? localStorage.getItem("oookea_session") || "" : ""),  clientId } : (isAdmin ? { token: localStorage.getItem("oookea_session") || "" } : "skip")
  );

  const generateUploadUrl = useMutation(api.projects.generateUploadUrl);
  const createFileRecord = useMutation(api.projects.createFile);
  const logActivity = useMutation(api.projects.logActivity);

  // Real upload to Convex storage: get upload URL -> POST file -> create DB record
  const handleUpload = async (uploaded: File[]) => {
    for (const f of uploaded) {
      try {
        setUploadingCount((n) => n + 1);
        const postUrl = await generateUploadUrl({
          token: localStorage.getItem("oookea_session") || "",
        });
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": f.type || "application/octet-stream" },
          body: f,
        });
        const json = await result.json();
        if (!result.ok || !json.storageId) {
          throw new Error(json.errorMessage || "Upload failed");
        }
        await createFileRecord({ token: (typeof window !== "undefined" ? localStorage.getItem("oookea_session") || "" : ""), 
          name: f.name,
          clientId: (isAdmin ? user!.id : clientId!) as Id<"users">,
          type: classifyFile(f),
          size: f.size,
          mimeType: f.type || "application/octet-stream",
          storageId: json.storageId as string,
          uploadedBy: user!.id as Id<"users">,
        });
        await logActivity({
          token: localStorage.getItem("oookea_session") || "",
          clientId: (isAdmin ? user!.id : clientId!) as Id<"users"> | undefined,
          type: "upload",
          message: `${user?.name ?? "Someone"} uploaded "${f.name}"`,
        }).catch(() => {});
      } catch (err) {
        console.error("Upload failed:", err);
        setUploadError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploadingCount((n) => n - 1);
      }
    }
  };

  function classifyFile(f: File): FileType {
    return f.type.startsWith("image/")
      ? "image"
      : f.type.startsWith("video/")
        ? "video"
        : f.type.includes("pdf") || f.type.includes("document") || f.type.includes("sheet")
          ? "document"
          : f.type.includes("zip") || f.type.includes("archive")
            ? "archive"
            : "other";
  }

  // Merge Convex files with locally uploaded files
  const allFiles: FileItem[] = [
    ...(convexFiles?.map((f) => ({
      id: f._id,
      name: f.name,
      type: f.type as FileType,
      size: f.size,
      url: f.storageId ? `/api/file/${f.storageId}` : "/files/mock",
      thumbnail: undefined,
      uploadedAt: new Date(f.createdAt).toISOString(),
      uploadedBy: user?.name || "Unknown",
      projectSlug: undefined,
      mimeType: f.mimeType,
    })) ?? []),
  ];

  const filtered = allFiles.filter((f) => {
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase());
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "other") {
      return matchesSearch && f.type !== "image" && f.type !== "document" && f.type !== "video";
    }
    return matchesSearch && f.type === activeTab;
  });

  // Viewable items for the lightbox
  const lightboxItems: LightboxItem[] = filtered
    .filter((f) => ["image", "design", "video", "document"].includes(f.type))
    .map((f) => ({ name: f.name, url: f.url, type: f.type }));
  const openLightbox = (file: FileItem) => {
    const i = lightboxItems.findIndex((li) => li.name === file.name);
    setLightboxIdx(i >= 0 ? i : 0);
  };

  // Real storage usage from Convex file records
  const totalBytes = (convexFiles ?? []).reduce((sum, f) => sum + (f.size || 0), 0);
  const STORAGE_TOTAL = 500 * 1_048_576; // 500 MB plan
  const usedPercent = Math.min(100, Math.round((totalBytes / STORAGE_TOTAL) * 100));

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
                    {formatStorage(totalBytes)} of {formatStorage(STORAGE_TOTAL_PLAN)} used
                  </p>
                </div>
              </div>
              <p className="text-lg font-semibold text-foreground">{usedPercent}%</p>
            </div>
            <Progress value={usedPercent} className="mt-3 h-2.5 bg-muted" />
          </div>

          {/* Upload status */}
          {uploadingCount > 0 && (
            <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Uploading {uploadingCount} file{uploadingCount > 1 ? "s" : ""}…
            </div>
          )}
          {uploadError && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
              Upload failed: {uploadError}
            </div>
          )}

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
                <FileCard key={file.id} file={file} viewMode="grid" onOpen={(f) => openLightbox(f)} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((file) => (
                <FileCard key={file.id} file={file} viewMode="list" onOpen={(f) => openLightbox(f)} />
              ))}
            </div>
          )}
        </div>
        <Lightbox
          items={lightboxItems}
          index={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onIndexChange={setLightboxIdx}
        />
      </AppLayout>
    </ProtectedRoute>
  );
}
