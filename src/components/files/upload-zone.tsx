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
          ? "border-[#6366F1] bg-[#6366F1]/5"
          : isDragReject
            ? "border-red-400 bg-red-50"
            : "border-[#E2E8F0] bg-[#FAFAFA] hover:border-[#6366F1]/40 hover:bg-[#6366F1]/5",
        className
      )}
    >
      <input {...getInputProps()} />
      <div
        className={cn(
          "mb-4 flex h-14 w-14 items-center justify-center rounded-2xl transition-colors",
          isDragActive ? "bg-[#6366F1]/10" : "bg-[#F1F5F9]"
        )}
      >
        {isDragActive ? (
          <CloudUpload className="h-7 w-7 text-[#6366F1]" />
        ) : (
          <Upload className="h-7 w-7 text-[#94A3B8]" />
        )}
      </div>
      {isDragActive ? (
        <>
          <p className="text-sm font-medium text-[#6366F1]">Drop files to upload</p>
          <p className="mt-1 text-xs text-[#64748B]">Release to add your files</p>
        </>
      ) : isDragReject ? (
        <>
          <p className="text-sm font-medium text-red-500">Some files are not allowed</p>
          <p className="mt-1 text-xs text-[#64748B]">Please check file types and sizes</p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-[#0F172A]">
            Drag files here or <span className="text-[#6366F1]">click to upload</span>
          </p>
          <p className="mt-1 text-xs text-[#64748B]">
            Supports images, documents, videos, and archives up to 50 MB
          </p>
        </>
      )}
    </div>
  );
}
