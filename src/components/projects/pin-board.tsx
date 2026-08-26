"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Check, X, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * PinBoard — optional visual annotation layer for image deliverables.
 * Renders INSIDE the deliverable card only when artUrl is set.
 * Click anywhere on the art → pin composer at that spot.
 * Numbered pins, resolve toggles, author names.
 */

type Pin = {
  _id: string;
  x: number;
  y: number;
  authorName: string;
  body: string;
  resolved: boolean;
  createdAt: number;
};

export function PinBoard({ deliverableId, artUrl }: { deliverableId: string; artUrl: string }) {
  const sessionToken = typeof window !== "undefined" ? localStorage.getItem("oookea_session") || "" : "";
  const pins = useQuery(
    api.projects.listPins,
    sessionToken ? { token: sessionToken, deliverableId: deliverableId as Id<"deliverables"> } : "skip"
  ) as Pin[] | undefined;
  const addPin = useMutation(api.projects.addPin);
  const toggleResolved = useMutation(api.projects.togglePinResolved);

  const [composer, setComposer] = useState<{ x: number; y: number } | null>(null);
  const [text, setText] = useState("");
  const [activePin, setActivePin] = useState<string | null>(null);
  const imgRef = useRef<HTMLDivElement>(null);

  const open = (pins ?? []).filter((p) => !p.resolved).length;

  const handleClick = (e: React.MouseEvent) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    setComposer({ x, y });
    setText("");
  };

  const submit = async () => {
    if (!composer || !text.trim()) return;
    await addPin({
      token: sessionToken,
      deliverableId: deliverableId as Id<"deliverables">,
      x: composer.x,
      y: composer.y,
      body: text.trim(),
    });
    setComposer(null);
    setText("");
  };

  return (
    <div className="mt-3 space-y-2">
      {/* The art with pin layer */}
      <div
        ref={imgRef}
        className="relative cursor-crosshair overflow-hidden rounded-xl border border-border"
        onClick={handleClick}
      >
        <img src={artUrl} alt="deliverable" className="block max-h-72 w-full object-contain bg-background" />

        {/* Existing pins */}
        {(pins ?? []).map((p, i) => (
          <button
            key={p._id}
            onClick={(e) => {
              e.stopPropagation();
              setActivePin(activePin === p._id ? null : p._id);
            }}
            className={cn(
              "absolute z-10 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[10px] font-bold shadow-lg transition-transform hover:scale-125",
              p.resolved
                ? "bg-[#22C55E] text-white opacity-60"
                : "bg-[#6366F1] text-white ring-2 ring-white/70"
            )}
            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
          >
            {p.resolved ? <Check className="h-3 w-3" /> : i + 1}
          </button>
        ))}

        {/* Pin detail popover */}
        {activePin &&
          (() => {
            const p = (pins ?? []).find((x) => x._id === activePin);
            if (!p) return null;
            return (
              <div
                className="absolute z-20 w-56 rounded-xl border border-border bg-popover p-3 shadow-xl"
                style={{
                  left: `min(max(${p.x * 100}%, 60px), calc(100% - 60px))`,
                  top: `${p.y * 100}%`,
                  transform: "translate(-50%, 12px)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-[11px] font-semibold text-primary">{p.authorName}</p>
                <p className="mt-1 text-xs leading-relaxed text-foreground">{p.body}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <button
                    className={cn(
                      "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                      p.resolved
                        ? "text-muted-foreground hover:text-foreground"
                        : "text-[#16A34A] hover:bg-[#22C55E]/10"
                    )}
                    onClick={() =>
                      toggleResolved({
                        token: sessionToken,
                        pinId: p._id as Id<"deliverablePins">,
                        resolved: !p.resolved,
                      })
                    }
                  >
                    <Check className="h-3 w-3" />
                    {p.resolved ? "Reopen" : "Resolve"}
                  </button>
                </div>
              </div>
            );
          })()}

        {/* New pin composer */}
        {composer && (
          <div
            className="absolute z-20 w-56 rounded-xl border border-border bg-popover p-3 shadow-xl"
            style={{
              left: `min(max(${composer.x * 100}%, 60px), calc(100% - 60px))`,
              top: `${composer.y * 100}%`,
              transform: "translate(-50%, 12px)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Textarea
              autoFocus
              placeholder="What should change here?"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              className="text-xs"
            />
            <div className="mt-2 flex justify-end gap-1.5">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setComposer(null)}>
                <X className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                className="h-7 bg-primary text-xs text-white hover:bg-primary/90"
                disabled={!text.trim()}
                onClick={submit}
              >
                <MessageSquare className="mr-1 h-3 w-3" /> Pin
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Hint row */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          Click the image to comment
        </span>
        {open > 0 && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
            {open} open pin{open > 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}
