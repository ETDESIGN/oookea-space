"use client";

import { useState } from "react";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Upload,
  Search,
  FileIcon,
  Image,
  FileText,
  Video,
  Palette,
  Archive,
  MoreHorizontal,
  Download,
  Trash2,
  Grid3X3,
  List,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

const typeIcons: Record<string, any> = {
  image: Image,
  document: FileText,
  video: Video,
  design: Palette,
  archive: Archive,
  other: FileIcon,
};

const typeColors: Record<string, string> = {
  image: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  document: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  video: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  design: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
  archive: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  other: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminUploadsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");

  const files = useQuery(api.projects.listFiles, { token: (typeof window !== "undefined" ? localStorage.getItem("oookea_session") || "" : ""), });
  const deleteFile = useMutation(api.projects.deleteFile);

  if (user?.role !== "admin") {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex items-center justify-center py-20">
            <p className="text-muted-foreground">Access denied.</p>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  const filtered = files?.filter((f) => f.name.toLowerCase().includes(search.toLowerCase())) ?? [];

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">All Files</h1>
              <p className="mt-1 text-muted-foreground">Manage all uploaded files across clients.</p>
            </div>
          </div>

          {/* Upload Zone (placeholder) */}
          <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-8 text-center">
            <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium text-foreground">Drop files here to upload</p>
            <p className="mt-1 text-xs text-muted-foreground">
              File upload will be connected to Convex storage in the next update
            </p>
          </div>

          {/* Search + View Toggle */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search files…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 border-border"
              />
            </div>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setView("grid")}
                className={`p-2 ${view === "grid" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView("list")}
                className={`p-2 ${view === "list" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Files */}
          {files === undefined ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FileIcon className="h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-sm font-medium text-foreground">No files found</p>
              <p className="mt-1 text-sm text-muted-foreground">Upload files to see them here.</p>
            </div>
          ) : view === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((file) => {
                const Icon = typeIcons[file.type] || FileIcon;
                return (
                  <Card key={file._id} className="border-border hover:shadow-md transition-shadow group">
                    <CardContent className="p-4">
                      <div className={`mx-auto flex h-20 items-center justify-center rounded-xl ${typeColors[file.type] || typeColors.other}`}>
                        <Icon className="h-8 w-8" />
                      </div>
                      <p className="mt-3 text-sm font-medium text-foreground truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px]">{file.type}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                          onClick={() => deleteFile({ token: localStorage.getItem("oookea_session") || "", id: file._id })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-border overflow-hidden">
              {filtered.map((file, i) => {
                const Icon = typeIcons[file.type] || FileIcon;
                return (
                  <div key={file._id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-border" : ""}`}>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${typeColors[file.type] || typeColors.other}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(file.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatSize(file.size)}</span>
                    <Badge variant="outline" className="text-[10px]">{file.type}</Badge>
                  </div>
                );
              })}
            </Card>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
