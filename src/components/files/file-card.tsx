"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  FileImage,
  FileVideo,
  FileArchive,
  File,
  Download,
  MoreVertical,
} from "lucide-react";
import type { FileItem, FileType } from "@/types";

const fileTypeConfig: Record<FileType, { icon: React.ElementType; color: string; bg: string }> = {
  image: { icon: FileImage, color: "text-[#EC4899]", bg: "bg-[#EC4899]/10" },
  document: { icon: FileText, color: "text-primary", bg: "bg-primary/10" },
  video: { icon: FileVideo, color: "text-[#F59E0B]", bg: "bg-[#F59E0B]/10" },
  design: { icon: FileImage, color: "text-[#8B5CF6]", bg: "bg-[#8B5CF6]/10" },
  archive: { icon: FileArchive, color: "text-muted-foreground", bg: "bg-[#64748B]/10" },
  other: { icon: File, color: "text-muted-foreground", bg: "bg-[#94A3B8]/10" },
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface FileCardProps {
  file: FileItem;
  viewMode?: "grid" | "list";
}

export function FileCard({ file, viewMode = "grid" }: FileCardProps) {
  const config = fileTypeConfig[file.type] || fileTypeConfig.other;
  const Icon = config.icon;

  if (viewMode === "list") {
    return (
      <div className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary/30 hover:shadow-sm">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", config.bg)}>
          {file.thumbnail ? (
            <img
              src={file.thumbnail}
              alt={file.name}
              className="h-10 w-10 rounded-lg object-cover"
            />
          ) : (
            <Icon className={cn("h-5 w-5", config.color)} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(file.size)} · {formatDate(file.uploadedAt)}
          </p>
        </div>
        <p className="hidden text-xs text-muted-foreground sm:block">{file.uploadedBy}</p>
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 text-muted-foreground hover:text-primary"
          onClick={() => window.open(file.url, "_blank")}
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Card className="group border-border bg-card shadow-sm transition-all hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5">
      {/* Thumbnail Area */}
      <div className="relative flex h-36 items-center justify-center overflow-hidden rounded-t-xl bg-background">
        {file.type === "image" && file.thumbnail ? (
          <img
            src={file.thumbnail}
            alt={file.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl", config.bg)}>
            <Icon className={cn("h-7 w-7", config.color)} />
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <p className="truncate text-sm font-medium text-foreground" title={file.name}>
          {file.name}
        </p>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {formatFileSize(file.size)} · {formatDate(file.uploadedAt)}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
            onClick={() => window.open(file.url, "_blank")}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
