"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/lib/auth";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Mail,
  FileText,
  KeyRound,
  FolderKanban,
  HardDrive,
  Blocks,
  ToggleLeft,
} from "lucide-react";
import Link from "next/link";

const mockClient = {
  id: "1",
  name: "Sarah Johnson",
  email: "sarah@techcorp.com",
  company: "TechCorp International",
  phone: "+1 (555) 123-4567",
  joinedAt: "2025-08-15",
  status: "active" as const,
  projects: [
    { id: "1", title: "Website Redesign", status: "active", progress: 75 },
    { id: "2", title: "Brand Identity", status: "completed", progress: 100 },
    { id: "5", title: "Mobile App UI", status: "on-hold", progress: 30 },
  ],
  invoices: [
    { id: "1", number: "INV-2026-001", amount: 4500, status: "paid", date: "2026-01-15" },
    { id: "3", number: "INV-2026-003", amount: 2800, status: "sent", date: "2026-03-01" },
    { id: "6", number: "INV-2026-006", amount: 1200, status: "overdue", date: "2026-04-01" },
  ],
  storage: { used: 340, total: 500 },
  modules: [
    { id: "m1", name: "AI Marketing Workflow", enabled: true },
    { id: "m2", name: "Product Sourcing", enabled: false },
    { id: "m3", name: "OpenClaw AI Agent", enabled: true },
    { id: "m4", name: "Custom Integration", enabled: false },
  ],
};

const statusColors = {
  active: "bg-[#22C55E]/10 text-[#22C55E]",
  "on-hold": "bg-[#F59E0B]/10 text-[#F59E0B]",
  completed: "bg-[#6366F1]/10 text-[#6366F1]",
};

const invoiceStatusColors = {
  paid: "bg-[#22C55E]/10 text-[#22C55E]",
  sent: "bg-[#6366F1]/10 text-[#6366F1]",
  overdue: "bg-[#EF4444]/10 text-[#EF4444]",
  draft: "bg-[#94A3B8]/10 text-[#94A3B8]",
};

export default function ClientDetailPage() {
  const { user } = useAuth();
  const [clientActive, setClientActive] = useState(mockClient.status === "active");
  const [modules, setModules] = useState(mockClient.modules);
  const c = mockClient;

  if (user?.role !== "admin") {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex items-center justify-center py-20">
            <p className="text-[#64748B]">Access denied.</p>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <Link href="/admin/clients" className="flex items-center gap-1 text-[#6366F1] hover:text-[#4F46E5]">
              <ArrowLeft className="h-4 w-4" />
              Clients
            </Link>
            <span className="text-[#94A3B8]">/</span>
            <span className="text-[#64748B]">{c.name}</span>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="space-y-6 lg:col-span-2">
              {/* Client Info */}
              <Card className="border-[#E2E8F0]">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#6366F1] text-lg font-bold text-white">
                        {c.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-[#0F172A]">{c.name}</h2>
                        <p className="text-sm text-[#64748B]">{c.company}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${clientActive ? "bg-[#22C55E]/10 text-[#22C55E]" : "bg-[#94A3B8]/10 text-[#94A3B8]"}`}>
                        {clientActive ? "Active" : "Inactive"}
                      </span>
                      <button
                        onClick={() => setClientActive(!clientActive)}
                        className="text-xs text-[#6366F1] hover:text-[#4F46E5] font-medium"
                      >
                        <ToggleLeft className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <Separator className="my-4 bg-[#E2E8F0]" />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium text-[#94A3B8] uppercase">Email</p>
                      <p className="mt-1 text-sm text-[#0F172A]">{c.email}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#94A3B8] uppercase">Phone</p>
                      <p className="mt-1 text-sm text-[#0F172A]">{c.phone}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#94A3B8] uppercase">Company</p>
                      <p className="mt-1 text-sm text-[#0F172A]">{c.company}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#94A3B8] uppercase">Joined</p>
                      <p className="mt-1 text-sm text-[#0F172A]">
                        {new Date(c.joinedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Projects */}
              <Card className="border-[#E2E8F0]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FolderKanban className="h-4 w-4 text-[#6366F1]" />
                    Projects ({c.projects.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {c.projects.map((p) => (
                    <div key={p.id} className="flex items-center gap-4 rounded-lg border border-[#E2E8F0] p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#0F172A]">{p.title}</p>
                        <span className={`inline-flex mt-1 items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[p.status as keyof typeof statusColors] || "bg-[#94A3B8]/10 text-[#94A3B8]"}`}>
                          {p.status}
                        </span>
                      </div>
                      <div className="text-right w-24">
                        <p className="text-sm font-medium text-[#0F172A]">{p.progress}%</p>
                        <Progress value={p.progress} className="mt-1 h-1.5 bg-[#F1F5F9]" />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Invoices */}
              <Card className="border-[#E2E8F0]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4 text-[#6366F1]" />
                    Recent Invoices
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {c.invoices.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between rounded-lg border border-[#E2E8F0] p-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono font-medium text-[#0F172A]">{inv.number}</span>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${invoiceStatusColors[inv.status as keyof typeof invoiceStatusColors]}`}>
                            {inv.status}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-[#0F172A]">${inv.amount.toLocaleString()}</p>
                          <p className="text-[10px] text-[#94A3B8]">{new Date(inv.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Storage */}
              <Card className="border-[#E2E8F0]">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <HardDrive className="h-4 w-4 text-[#6366F1]" />
                    <h3 className="text-sm font-semibold text-[#0F172A]">Storage</h3>
                  </div>
                  <div className="text-center mb-3">
                    <span className="text-2xl font-bold text-[#0F172A]">{c.storage.used} MB</span>
                    <span className="text-sm text-[#64748B]"> / {c.storage.total} MB</span>
                  </div>
                  <Progress value={(c.storage.used / c.storage.total) * 100} className="h-2.5 bg-[#F1F5F9]" />
                  <p className="mt-2 text-xs text-center text-[#94A3B8]">{Math.round((c.storage.used / c.storage.total) * 100)}% used</p>
                </CardContent>
              </Card>

              {/* Modules */}
              <Card className="border-[#E2E8F0]">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Blocks className="h-4 w-4 text-[#6366F1]" />
                    <h3 className="text-sm font-semibold text-[#0F172A]">Modules</h3>
                  </div>
                  <div className="space-y-3">
                    {modules.map((mod) => (
                      <div key={mod.id} className="flex items-center justify-between">
                        <span className="text-sm text-[#0F172A]">{mod.name}</span>
                        <Checkbox
                          checked={mod.enabled}
                          onCheckedChange={(checked) =>
                            setModules(modules.map((m) => m.id === mod.id ? { ...m, enabled: !!checked } : m))
                          }
                          className="data-[state=checked]:bg-[#6366F1] data-[state=checked]:border-[#6366F1]"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="border-[#E2E8F0]">
                <CardContent className="p-6 space-y-2">
                  <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Quick Actions</h3>
                  <Button variant="outline" className="w-full justify-start border-[#E2E8F0]">
                    <Mail className="mr-2 h-4 w-4" />
                    Send Message
                  </Button>
                  <Button variant="outline" className="w-full justify-start border-[#E2E8F0]">
                    <FileText className="mr-2 h-4 w-4" />
                    Create Invoice
                  </Button>
                  <Button variant="outline" className="w-full justify-start border-[#E2E8F0]">
                    <KeyRound className="mr-2 h-4 w-4" />
                    Reset Password
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
