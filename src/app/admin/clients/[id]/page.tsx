"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
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
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

const statusColors: Record<string, string> = {
  active: "bg-[#22C55E]/10 text-[#22C55E]",
  "on-hold": "bg-[#F59E0B]/10 text-[#F59E0B]",
  completed: "bg-[#6366F1]/10 text-[#6366F1]",
  draft: "bg-[#94A3B8]/10 text-[#94A3B8]",
};

const invoiceStatusColors: Record<string, string> = {
  paid: "bg-[#22C55E]/10 text-[#22C55E]",
  sent: "bg-[#6366F1]/10 text-[#6366F1]",
  overdue: "bg-[#EF4444]/10 text-[#EF4444]",
  draft: "bg-[#94A3B8]/10 text-[#94A3B8]",
  cancelled: "bg-[#94A3B8]/10 text-[#94A3B8]",
};

export default function ClientDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const clientId = params.id as string;

  const client = useQuery(
    api.projects.getUserById,
    clientId ? { id: clientId as Id<"users"> } : "skip"
  );
  const projects = useQuery(
    api.projects.listProjects,
    clientId ? { clientId: clientId as Id<"users"> } : "skip"
  );
  const invoices = useQuery(
    api.projects.listInvoices,
    clientId ? { clientId: clientId as Id<"users"> } : "skip"
  );
  const modules = useQuery(
    api.projects.listModules,
    clientId ? { clientId: clientId as Id<"users"> } : "skip"
  );
  const updateClient = useMutation(api.projects.updateClient);
  const toggleModule = useMutation(api.projects.toggleModule);

  const [clientActive, setClientActive] = useState(true);

  // Sync clientActive with fetched data
  const prevClientStatus = client?.status;
  if (prevClientStatus !== undefined) {
    // We use the fetched status as source of truth on initial load
    if (clientActive !== (prevClientStatus === "active")) {
      // Will be handled in render cycle
    }
  }

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

  const isLoading = client === undefined;

  const handleToggleStatus = async () => {
    if (!client) return;
    const newStatus = client.status === "active" ? "inactive" : "active";
    setClientActive(newStatus === "active");
    await updateClient({
      id: client._id as Id<"users">,
      status: newStatus as "active" | "inactive",
    });
  };

  const handleToggleModule = async (moduleId: string, enabled: boolean) => {
    await toggleModule({ id: moduleId as Id<"modules">, enabled });
  };

  // Use actual client status from data
  const isActive = client ? client.status === "active" : clientActive;

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
            <span className="text-[#64748B]">{client?.name ?? "Loading…"}</span>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#6366F1] border-t-transparent" />
            </div>
          ) : !client ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-lg font-medium text-[#0F172A]">Client not found</p>
              <p className="mt-1 text-sm text-[#64748B]">This client may have been removed.</p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Main Content */}
              <div className="space-y-6 lg:col-span-2">
                {/* Client Info */}
                <Card className="border-[#E2E8F0]">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#6366F1] text-lg font-bold text-white">
                          {client.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-[#0F172A]">{client.name}</h2>
                          <p className="text-sm text-[#64748B]">{client.company || "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${isActive ? "bg-[#22C55E]/10 text-[#22C55E]" : "bg-[#94A3B8]/10 text-[#94A3B8]"}`}>
                          {isActive ? "Active" : "Inactive"}
                        </span>
                        <button
                          onClick={handleToggleStatus}
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
                        <p className="mt-1 text-sm text-[#0F172A]">{client.email}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[#94A3B8] uppercase">Phone</p>
                        <p className="mt-1 text-sm text-[#0F172A]">{client.phone || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[#94A3B8] uppercase">Company</p>
                        <p className="mt-1 text-sm text-[#0F172A]">{client.company || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[#94A3B8] uppercase">Joined</p>
                        <p className="mt-1 text-sm text-[#0F172A]">
                          {new Date(client.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
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
                      Projects ({projects?.length ?? 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {projects === undefined ? (
                      <div className="flex justify-center py-8">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#6366F1] border-t-transparent" />
                      </div>
                    ) : projects.length === 0 ? (
                      <p className="py-8 text-center text-sm text-[#64748B]">No projects yet.</p>
                    ) : (
                      projects.map((p) => (
                        <div key={p._id} className="flex items-center gap-4 rounded-lg border border-[#E2E8F0] p-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#0F172A]">{p.title}</p>
                            <span className={`inline-flex mt-1 items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[p.status] || "bg-[#94A3B8]/10 text-[#94A3B8]"}`}>
                              {p.status}
                            </span>
                          </div>
                          <div className="text-right w-24">
                            <p className="text-sm font-medium text-[#0F172A]">{p.progress}%</p>
                            <Progress value={p.progress} className="mt-1 h-1.5 bg-[#F1F5F9]" />
                          </div>
                        </div>
                      ))
                    )}
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
                    {invoices === undefined ? (
                      <div className="flex justify-center py-8">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#6366F1] border-t-transparent" />
                      </div>
                    ) : invoices.length === 0 ? (
                      <p className="py-8 text-center text-sm text-[#64748B]">No invoices yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {invoices.map((inv) => (
                          <div key={inv._id} className="flex items-center justify-between rounded-lg border border-[#E2E8F0] p-3">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-mono font-medium text-[#0F172A]">{inv.number}</span>
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${invoiceStatusColors[inv.status] || ""}`}>
                                {inv.status}
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-[#0F172A]">${inv.total.toLocaleString()}</p>
                              <p className="text-[10px] text-[#94A3B8]">{new Date(inv.issueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Storage placeholder */}
                <Card className="border-[#E2E8F0]">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <HardDrive className="h-4 w-4 text-[#6366F1]" />
                      <h3 className="text-sm font-semibold text-[#0F172A]">Storage</h3>
                    </div>
                    <div className="text-center mb-3">
                      <span className="text-sm text-[#64748B]">Storage info coming soon</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Modules */}
                <Card className="border-[#E2E8F0]">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Blocks className="h-4 w-4 text-[#6366F1]" />
                      <h3 className="text-sm font-semibold text-[#0F172A]">Modules</h3>
                    </div>
                    {modules === undefined ? (
                      <div className="flex justify-center py-4">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#6366F1] border-t-transparent" />
                      </div>
                    ) : modules.length === 0 ? (
                      <p className="text-sm text-[#64748B]">No modules assigned.</p>
                    ) : (
                      <div className="space-y-3">
                        {modules.map((mod) => (
                          <div key={mod._id} className="flex items-center justify-between">
                            <span className="text-sm text-[#0F172A]">{mod.title}</span>
                            <Checkbox
                              checked={mod.enabled}
                              onCheckedChange={(checked) =>
                                handleToggleModule(mod._id, !!checked)
                              }
                              className="data-[state=checked]:bg-[#6366F1] data-[state=checked]:border-[#6366F1]"
                            />
                          </div>
                        ))}
                      </div>
                    )}
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
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
