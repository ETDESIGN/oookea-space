"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import { Upload, CloudUpload } from "lucide-react";

interface UploadZoneProps {
  onUpload: (files: File[]) => void;
  className?: string;
}

export function UploadZone({ onUpload, className }: UploadZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onUpload(acceptedFiles);
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: 50 * 1024 * 1024, // 50 MB
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all",
        isDragActive && !isDragReject
          ? "border-primary bg-primary/5"
          : isDragReject
            ? "border-red-400 bg-red-50"
            : "border-border bg-[#FAFAFA] hover:border-primary/40 hover:bg-primary/5",
        className
      )}
    >
      <input {...getInputProps()} />
      <div
        className={cn(
          "mb-4 flex h-14 w-14 items-center justify-center rounded-2xl transition-colors",
          isDragActive ? "bg-primary/10" : "bg-muted"
        )}
      >
        {isDragActive ? (
          <CloudUpload className="h-7 w-7 text-primary" />
        ) : (
          <Upload className="h-7 w-7 text-muted-foreground" />
        )}
      </div>
      {isDragActive ? (
        <>
          <p className="text-sm font-medium text-primary">Drop files to upload</p>
          <p className="mt-1 text-xs text-muted-foreground">Release to add your files</p>
        </>
      ) : isDragReject ? (
        <>
          <p className="text-sm font-medium text-red-500">Some files are not allowed</p>
          <p className="mt-1 text-xs text-muted-foreground">Please check file types and sizes</p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-foreground">
            Drag files here or <span className="text-primary">click to upload</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Supports images, documents, videos, and archives up to 50 MB
          </p>
        </>
      )}
    </div>
  );
}
