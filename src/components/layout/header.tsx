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
  Sun,
  Moon,
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
import { useTheme } from "@/lib/theme";
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
  const { theme, toggleTheme } = useTheme();
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
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-md lg:px-6">
        {/* Left: Mobile menu + Search */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-muted-foreground"
            onClick={onMobileMenuToggle}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Search trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden sm:flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-card"
          >
            <Search className="h-4 w-4" />
            <span>Search…</span>
            <kbd className="ml-4 hidden rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:inline">
              <span className="text-xs">⌘</span> K
            </kbd>
          </button>
        </div>

        {/* Right: Notifications + Avatar */}
        <div className="flex items-center gap-2">
          {/* Dark mode toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={toggleTheme}
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative text-muted-foreground hover:text-foreground"
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
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted outline-none">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-xs font-bold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium text-foreground md:block">
                {user?.name || "User"}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center gap-2 px-2 py-1.5">
                <div className="flex flex-col">
                  <p className="text-sm font-medium">{user?.name || "User"}</p>
                  <p className="text-xs text-muted-foreground">
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
              <DropdownMenuItem onClick={logout} className="text-destructive">
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
