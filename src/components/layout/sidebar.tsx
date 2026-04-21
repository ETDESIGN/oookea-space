"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  FileIcon,
  MessageSquare,
  Blocks,
  Settings,
  ChevronLeft,
  LogOut,
  X,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Invoices", href: "/invoices", icon: FileText },
  { label: "File Vault", href: "/files", icon: FileIcon },
  { label: "Messages", href: "/messages", icon: MessageSquare },
  { label: "Modules", href: "/modules", icon: Blocks },
];

const bottomItems = [
  { label: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#0F172A]">
      {/* Brand */}
      <div className="flex h-16 items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#6366F1]">
            <Palette className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold text-white tracking-tight">
                Oookea
              </span>
              <span className="text-[10px] uppercase tracking-widest text-[#64748B]">
                Digital Atelier
              </span>
            </div>
          )}
        </Link>
        {/* Mobile close */}
        <Button
          variant="ghost"
          size="icon"
          className="text-[#64748B] hover:text-white md:hidden"
          onClick={onMobileClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <Separator className="bg-[#1E293B]" />

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-[#6366F1] text-white shadow-lg shadow-[#6366F1]/25"
                  : "text-[#94A3B8] hover:bg-[#1E293B] hover:text-white"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : "text-[#64748B] group-hover:text-white")} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <Separator className="bg-[#1E293B]" />

      {/* Bottom nav */}
      <div className="space-y-1 px-3 py-4">
        {bottomItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-[#6366F1] text-white"
                  : "text-[#94A3B8] hover:bg-[#1E293B] hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0 text-[#64748B] group-hover:text-white" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </div>

      {/* User section */}
      <div className="border-t border-[#1E293B] p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#6366F1] text-xs font-bold text-white">
            {initials}
          </div>
          {!collapsed && (
            <div className="flex flex-1 items-center justify-between min-w-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  {user?.name || "User"}
                </p>
                <p className="truncate text-xs text-[#64748B]">
                  {user?.email || ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-[#64748B] hover:text-white shrink-0"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Collapse toggle (desktop only) */}
      <div className="hidden border-t border-[#1E293B] p-2 md:block">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-full text-[#64748B] hover:text-white"
          onClick={onToggle}
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform",
              collapsed && "rotate-180"
            )}
          />
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex h-screen shrink-0 flex-col border-r border-[#1E293B] transition-all duration-300",
          collapsed ? "w-[72px]" : "w-64"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar (sheet overlay) */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={onMobileClose}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 md:hidden">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
