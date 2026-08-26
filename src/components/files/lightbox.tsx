"use client";

import { useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Download, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Lightbox — immersive full-screen viewer for vault images.
 * Arrow keys navigate, Esc closes, click-outside closes, zoom toggle.
 */

export interface LightboxItem {
  name: string;
  url: string;
  type: string;
}

export function Lightbox({
  items,
  index,
  onClose,
  onIndexChange,
}: {
  items: LightboxItem[];
  index: number | null;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}) {
  const [zoom, setZoom] = useState(false);
  const open = index !== null;

  const next = useCallback(() => {
    if (index === null) return;
    onIndexChange((index + 1) % items.length);
    setZoom(false);
  }, [index, items.length, onIndexChange]);

  const prev = useCallback(() => {
    if (index === null) return;
    onIndexChange((index - 1 + items.length) % items.length);
    setZoom(false);
  }, [index, items.length, onIndexChange]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, next, prev, onClose]);

  if (index === null) return null;
  const item = items[index];
  const isImage = item.type === "image" || item.type === "design";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex flex-col bg-black/92 backdrop-blur-md"
        onClick={onClose}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" onClick={(e) => e.stopPropagation()}>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-100">{item.name}</p>
            <p className="text-xs text-zinc-500">
              {index + 1} of {items.length}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isImage && (
              <button
                onClick={() => setZoom((z) => !z)}
                className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
            )}
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Download className="h-5 w-5" />
            </a>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Stage */}
        <div
          className="relative flex flex-1 items-center justify-center overflow-hidden px-4 pb-6"
          onClick={onClose}
        >
          {items.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-4 z-10 rounded-full bg-white/5 p-3 text-zinc-300 backdrop-blur transition hover:bg-white/15 hover:text-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          <motion.div
            key={item.url}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "flex max-h-full max-w-full items-center justify-center",
              zoom && "cursor-zoom-out"
            )}
          >
            {isImage ? (
              <img
                src={item.url}
                alt={item.name}
                className={cn(
                  "rounded-xl object-contain shadow-2xl transition-transform duration-300",
                  zoom ? "max-w-none scale-[1.8]" : "max-h-[75vh] max-w-full"
                )}
                onClick={() => setZoom((z) => !z)}
              />
            ) : item.type === "video" ? (
              <video src={item.url} controls className="max-h-[75vh] rounded-xl shadow-2xl" />
            ) : (
              <iframe
                src={item.url}
                title={item.name}
                className="h-[75vh] w-full max-w-4xl rounded-xl bg-white shadow-2xl"
              />
            )}
          </motion.div>

          {items.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-4 z-10 rounded-full bg-white/5 p-3 text-zinc-300 backdrop-blur transition hover:bg-white/15 hover:text-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Filmstrip */}
        {items.length > 1 && (
          <div className="flex justify-center gap-2 overflow-x-auto px-4 pb-5" onClick={(e) => e.stopPropagation()}>
            {items.map((it, i) => (
              <button
                key={it.url + i}
                onClick={() => { onIndexChange(i); setZoom(false); }}
                className={cn(
                  "h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                  i === index ? "border-primary" : "border-transparent opacity-50 hover:opacity-80"
                )}
              >
                {it.type === "image" || it.type === "design" ? (
                  <img src={it.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-zinc-800 text-[9px] text-zinc-400">
                    {it.type.slice(0, 3).toUpperCase()}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
