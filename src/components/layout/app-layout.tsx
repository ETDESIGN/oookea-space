"use client";

import React, { useState } from "react";
import { Sidebar } from "./sidebar";
import { MobileTabBar } from "@/components/layout/mobile-tabbar";
import { Header } from "./header";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMobileMenuToggle={() => setMobileOpen(true)} />
        <main className="flex-1 pb-16 md:pb-0 overflow-y-auto scrollbar-thin">
          <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
      <MobileTabBar />
    </div>
  );
}
    
