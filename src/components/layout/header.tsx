"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  Bell,
  Search,
  Menu,
  LogOut,
  Settings,
  User,
  Command,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface HeaderProps {
  onMobileMenuToggle: () => void;
}

const searchPages = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Projects", href: "/projects" },
  { label: "Invoices", href: "/invoices" },
  { label: "File Vault", href: "/files" },
  { label: "Messages", href: "/messages" },
  { label: "Modules", href: "/modules" },
  { label: "Settings", href: "/settings" },
];

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const { user, logout } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifCount] = useState(3);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#E2E8F0] bg-white/80 px-4 backdrop-blur-md lg:px-6">
        {/* Left: Mobile menu + Search */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-[#64748B]"
            onClick={onMobileMenuToggle}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Search trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden sm:flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm text-[#64748B] transition-colors hover:border-[#6366F1]/40 hover:bg-white"
          >
            <Search className="h-4 w-4" />
            <span>Search…</span>
            <kbd className="ml-4 hidden rounded bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] font-medium text-[#94A3B8] lg:inline">
              <span className="text-xs">⌘</span> K
            </kbd>
          </button>
        </div>

        {/* Right: Notifications + Avatar */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative text-[#64748B] hover:text-[#0F172A]"
          >
            <Bell className="h-5 w-5" />
            {notifCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#EF4444] text-[10px] font-bold text-white">
                {notifCount}
              </span>
            )}
          </Button>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[#F1F5F9] outline-none">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-[#6366F1] text-xs font-bold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium text-[#0F172A] md:block">
                {user?.name || "User"}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center gap-2 px-2 py-1.5">
                <div className="flex flex-col">
                  <p className="text-sm font-medium">{user?.name || "User"}</p>
                  <p className="text-xs text-[#64748B]">
                    {user?.email || "user@example.com"}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-[#EF4444]">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Command Search Dialog */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Search pages, projects…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Pages">
            {searchPages.map((page) => (
              <CommandItem
                key={page.href}
                onSelect={() => {
                  window.location.href = page.href;
                  setSearchOpen(false);
                }}
              >
                <Command className="mr-2 h-4 w-4" />
                {page.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
