"use client";

import { useAuth } from "@/lib/auth";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * SidebarBrand — the co-branded lockup optimized for the dark sidebar.
 * Layout (expanded):  [CLIENT LOGO] × [O] Oookea / Digital Atelier
 * Layout (collapsed): stacked O monogram only (clean, iconic)
 * Admin sees the plain OookeA mark + Admin badge.
 */
export function SidebarBrand({ isAdmin, collapsed }: { isAdmin: boolean; collapsed: boolean }) {
  const { user } = useAuth();
  const sessionToken =
    typeof window !== "undefined" ? localStorage.getItem("oookea_session") || "" : "";

  const profile = useQuery(
    api.projects.getUserById,
    user?.id && sessionToken ? { token: sessionToken, id: user.id as any } : "skip"
  ) as any;

  const brandLogo = profile?.brandLogo as string | undefined;
  const clientName = profile?.company || profile?.name || "";

  return (
    <div className="flex items-center gap-2.5">
      {collapsed ? (
        /* Collapsed: just the OookeA monogram */
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#6366F1] to-[#4F46E5]">
          <span className="text-lg font-black text-white">O</span>
        </div>
      ) : (
        <>
          {/* Client mark */}
          {brandLogo ? (
            <img
              src={brandLogo}
              alt={clientName}
              className="h-7 w-auto max-w-[110px] rounded object-contain ring-1 ring-white/10 p-0.5"
            />
          ) : clientName && !isAdmin ? (
            <span className="max-w-[110px] truncate text-sm font-semibold uppercase tracking-[0.12em] text-zinc-200">
              {clientName}
            </span>
          ) : null}

          {/* Collaboration cross */}
          {clientName && !isAdmin && (
            <span className="text-xs font-light text-[#64748B]" aria-hidden>
              ×
            </span>
          )}

          {/* OookeA monogram */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#6366F1] to-[#4F46E5] shadow-[0_2px_10px_-2px_rgba(99,102,241,0.6)]">
            <span className="text-lg font-black text-white">O</span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white">Oookea</span>
              {isAdmin && (
                <Badge className="h-4 rounded bg-[#F59E0B] px-1.5 text-[9px] font-bold uppercase text-white border-0">
                  Admin
                </Badge>
              )}
            </div>
            <span className="text-[10px] uppercase tracking-widest text-[#64748B]">
              {isAdmin ? "Admin Portal" : "Digital Atelier"}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
