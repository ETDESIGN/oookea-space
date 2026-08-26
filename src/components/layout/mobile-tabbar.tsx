"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { LayoutDashboard, FolderKanban, MessageSquare, FolderOpen, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * MobileTabBar — bottom navigation for phones. Native-app feel,
 * pairs with the PWA. Hidden on md+ where the sidebar takes over.
 * Includes the live unread badge on Messages.
 */
export function MobileTabBar() {
  const pathname = usePathname();
  const sessionToken =
    typeof window !== "undefined" ? localStorage.getItem("oookea_session") || "" : "";
  const unread = useQuery(
    api.notifications.unreadCount,
    sessionToken ? { token: sessionToken } : "skip"
  );

  const tabs: { href: string; label: string; icon: any; badge?: number }[] = [
    { href: "/dashboard", label: "Home", icon: LayoutDashboard },
    { href: "/projects", label: "Projects", icon: FolderKanban },
    { href: "/messages", label: "Messages", icon: MessageSquare, badge: unread ?? 0 },
    { href: "/files", label: "Vault", icon: FolderOpen },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-5">
        {tabs.map((t) => {
          const active = pathname.startsWith(t.href);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "relative flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="relative">
                <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_6px_rgba(99,102,241,0.5)]")} />
                {(t.badge ?? 0) > 0 && (
                  <span className="absolute -right-1.5 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#EF4444] px-0.5 text-[8px] font-bold text-white">
                    {(t.badge ?? 0) > 9 ? "9+" : t.badge}
                  </span>
                )}
              </span>
              {t.label}
              {active && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
