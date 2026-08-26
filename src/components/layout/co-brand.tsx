"use client";

import { useAuth } from "@/lib/auth";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";

/**
 * CoBrandLockup — the signature brand moment of Oookea Space.
 *
 * Design language: "Client × Studio" — a refined lockup that says
 * "custom-built for you, by OookeA". The client mark sits proud on the left;
 * a thin multiplication cross (×, the designer's "in collaboration with")
 * joins it to the OookeA monogram on the right.
 *
 *   [CLIENT LOGO] × [O]
 *
 * - Client logo: uploaded by admin (brandLogo), falls back to a typographic
 *   treatment of the client company name so the lockup always looks complete.
 * - The × is set small, in a muted tone, with generous optical spacing.
 * - OookeA monogram: the solid indigo rounded square + white "O" — always
 *   crisp, never scaled below legibility.
 * - If no client brand is set at all (admin login), only the OookeA mark shows.
 */

interface CoBrandLockupProps {
  /** Visual size variant */
  size?: "md" | "lg";
  /** Color scheme context */
  tone?: "light" | "dark";
  className?: string;
}

export function CoBrandLockup({ size = "md", tone = "light", className }: CoBrandLockupProps) {
  const { user } = useAuth();
  const sessionToken =
    typeof window !== "undefined" ? localStorage.getItem("oookea_session") || "" : "";

  const profile = useQuery(
    api.projects.getUserById,
    user?.id && sessionToken
      ? { token: sessionToken, id: user.id as any }
      : "skip"
  ) as any;

  const brandLogo = (profile as any)?.brandLogo as string | undefined;
  const clientName =
    (profile as any)?.company || (profile as any)?.name || user?.company || "";
  const brandColor = (profile as any)?.brandColor as string | undefined;
  const isAdmin = user?.role === "admin";

  const isDark = tone === "dark";
  const initials = clientName
    .split(" ")
    .map((w: string) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const textPrimary = isDark ? "text-zinc-100" : "text-zinc-900";
  const textMuted = isDark ? "text-zinc-500" : "text-zinc-400";

  const logoH = size === "lg" ? "h-9" : "h-7";
  const monogramSize = size === "lg" ? "h-11 w-11 text-xl" : "h-8 w-8 text-sm";
  const nameSize = size === "lg" ? "text-lg" : "text-sm";

  return (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      {/* ── Client mark ─────────────────────────────────────── */}
      {brandLogo ? (
        <img
          src={brandLogo}
          alt={clientName}
          className={cn(logoH, "w-auto max-w-[140px] object-contain")}
          style={brandColor ? { filter: "brightness(1)" } : undefined}
        />
      ) : clientName && !isAdmin ? (
        // Typographic fallback: tracked-out small caps
        <span
          className={cn(
            nameSize,
            "font-semibold tracking-[0.14em] uppercase",
            textPrimary
          )}
          style={brandColor && !isDark ? { color: brandColor } : undefined}
        >
          {clientName}
        </span>
      ) : null}

      {/* ── The collaboration cross ─────────────────────────── */}
      {clientName && !isAdmin && (
        <span
          className={cn(
            "font-light leading-none",
            textMuted,
            size === "lg" ? "text-base" : "text-xs"
          )}
          style={{ transform: "translateY(-1px)" }}
          aria-label="in collaboration with"
        >
          ×
        </span>
      )}

      {/* ── OookeA monogram ─────────────────────────────────── */}
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            monogramSize,
            "flex shrink-0 items-center justify-center rounded-xl",
            "bg-gradient-to-br from-[#6366F1] to-[#4F46E5]",
            "shadow-[0_2px_12px_-2px_rgba(99,102,241,0.5)]"
          )}
        >
          <span className="font-black text-white">O</span>
        </div>
        <div className="hidden flex-col leading-none sm:flex">
          <span className={cn(nameSize, "font-bold tracking-tight", textPrimary)}>
            Oookea
          </span>
          <span
            className={cn(
              "text-[9px] font-semibold uppercase tracking-[0.22em]",
              textMuted
            )}
          >
            Digital Atelier
          </span>
        </div>
      </div>
    </div>
  );
}
