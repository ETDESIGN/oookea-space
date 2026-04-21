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
  SlidersHorizontal,
} from "lucide-react";
import type { FileItem, FileType } from "@/types";

const mockFiles: FileItem[] = [
  {
    id: "f1",
    name: "homepage-hero-v3.png",
    type: "image",
    size: 4_200_000,
    url: "/files/mock",
    thumbnail: "",
    uploadedAt: "2026-04-18T10:30:00Z",
    uploadedBy: "Sarah Chen",
    projectSlug: "website-redesign",
    mimeType: "image/png",
  },
  {
    id: "f2",
    name: "brand-guidelines-2026.pdf",
    type: "document",
    size: 8_500_000,
    url: "/files/mock",
    uploadedAt: "2026-04-15T14:20:00Z",
    uploadedBy: "Mike Torres",
    projectSlug: "brand-identity",
    mimeType: "application/pdf",
  },
  {
    id: "f3",
    name: "product-demo-final.mp4",
    type: "video",
    size: 125_000_000,
    url: "/files/mock",
    uploadedAt: "2026-04-12T09:00:00Z",
    uploadedBy: "Sarah Chen",
    projectSlug: "ai-marketing-workflow",
    mimeType: "video/mp4",
  },
  {
    id: "f4",
    name: "logo-dark.svg",
    type: "image",
    size: 48_000,
    url: "/files/mock",
    thumbnail: "",
    uploadedAt: "2026-04-10T16:45:00Z",
    uploadedBy: "Alex Kim",
    projectSlug: "brand-identity",
    mimeType: "image/svg+xml",
  },
  {
    id: "f5",
    name: "q1-report.xlsx",
    type: "document",
    size: 1_200_000,
    url: "/files/mock",
    uploadedAt: "2026-04-08T11:15:00Z",
    uploadedBy: "Mike Torres",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
  {
    id: "f6",
    name: "ui-wireframes.fig",
    type: "design",
    size: 6_800_000,
    url: "/files/mock",
    uploadedAt: "2026-04-05T13:30:00Z",
    uploadedBy: "Sarah Chen",
    projectSlug: "website-redesign",
    mimeType: "application/x-figma",
  },
  {
    id: "f7",
    name: "supplier-catalog.zip",
    type: "archive",
    size: 34_000_000,
    url: "/files/mock",
    uploadedAt: "2026-04-03T08:00:00Z",
    uploadedBy: "Alex Kim",
    projectSlug: "product-sourcing",
    mimeType: "application/zip",
  },
  {
    id: "f8",
    name: "team-standup-recording.mp4",
    type: "video",
    size: 52_000_000,
    url: "/files/mock",
    uploadedAt: "2026-04-01T17:00:00Z",
    uploadedBy: "Mike Torres",
    mimeType: "video/mp4",
  },
  {
    id: "f9",
    name: "contract-amendment.docx",
    type: "document",
    size: 340_000,
    url: "/files/mock",
    uploadedAt: "2026-03-28T10:00:00Z",
    uploadedBy: "Alex Kim",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  {
    id: "f10",
    name: "og-social-image.jpg",
    type: "image",
    size: 2_100_000,
    url: "/files/mock",
    thumbnail: "",
    uploadedAt: "2026-03-25T15:20:00Z",
    uploadedBy: "Sarah Chen",
    projectSlug: "website-redesign",
    mimeType: "image/jpeg",
  },
];

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
  const [files, setFiles] = useState<FileItem[]>(mockFiles);

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
    setFiles((prev) => [...newFiles, ...prev]);
  };

  const filtered = files.filter((f) => {
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase());
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "other") {
      return matchesSearch && f.type !== "image" && f.type !== "document" && f.type !== "video";
    }
    return matchesSearch && f.type === activeTab;
  });

  const usedPercent = Math.round((STORAGE_USED / STORAGE_TOTAL) * 100);

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">File Vault</h1>
            <p className="mt-1 text-[#64748B]">
              Manage and download all your project files and assets.
            </p>
          </div>

          {/* Storage Usage */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#6366F1]/10">
                  <HardDrive className="h-5 w-5 text-[#6366F1]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#0F172A]">Storage</p>
                  <p className="text-xs text-[#64748B]">
                    {formatStorage(STORAGE_USED)} of {formatStorage(STORAGE_TOTAL)} used
                  </p>
                </div>
              </div>
              <p className="text-lg font-semibold text-[#0F172A]">{usedPercent}%</p>
            </div>
            <Progress value={usedPercent} className="mt-3 h-2.5 bg-[#F1F5F9]" />
          </div>

          {/* Upload Zone */}
          <UploadZone onUpload={handleUpload} />

          {/* Filters */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-[#F1F5F9]">
                {fileTabs.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="data-[state=active]:bg-white data-[state=active]:text-[#6366F1] data-[state=active]:shadow-sm"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                <Input
                  placeholder="Search files…"
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

          {/* Files */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F1F5F9]">
                <Search className="h-8 w-8 text-[#94A3B8]" />
              </div>
              <p className="text-lg font-medium text-[#0F172A]">No files found</p>
              <p className="mt-1 text-sm text-[#64748B]">Try adjusting your search or filters.</p>
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
