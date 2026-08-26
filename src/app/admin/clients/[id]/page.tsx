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
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

const statusColors: Record<string, string> = {
  active: "bg-[#22C55E]/10 text-[#22C55E]",
  "on-hold": "bg-[#F59E0B]/10 text-[#F59E0B]",
  completed: "bg-primary/10 text-primary",
  draft: "bg-[#94A3B8]/10 text-muted-foreground",
};

const invoiceStatusColors: Record<string, string> = {
  paid: "bg-[#22C55E]/10 text-[#22C55E]",
  sent: "bg-primary/10 text-primary",
  overdue: "bg-[#EF4444]/10 text-destructive",
  draft: "bg-[#94A3B8]/10 text-muted-foreground",
  cancelled: "bg-[#94A3B8]/10 text-muted-foreground",
};

export default function ClientDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const clientId = params.id as string;

  const client = useQuery(
    api.projects.getUserById,
    clientId ? { token: (typeof window !== "undefined" ? localStorage.getItem("oookea_session") || "" : ""),  id: clientId as Id<"users"> } : "skip"
  ) as any; // safe-stripped user record (no passwordHash)
  const projects = useQuery(
    api.projects.listProjects,
    clientId ? { token: (typeof window !== "undefined" ? localStorage.getItem("oookea_session") || "" : ""),  clientId: clientId as Id<"users"> } : "skip"
  );
  const invoices = useQuery(
    api.projects.listInvoices,
    clientId ? { token: (typeof window !== "undefined" ? localStorage.getItem("oookea_session") || "" : ""),  clientId: clientId as Id<"users"> } : "skip"
  );
  const modules = useQuery(
    api.projects.listModules,
    clientId ? { token: (typeof window !== "undefined" ? localStorage.getItem("oookea_session") || "" : ""),  clientId: clientId as Id<"users"> } : "skip"
  );
  const updateClient = useMutation(api.projects.updateClient);
  const toggleModule = useMutation(api.projects.toggleModule);
  const resetClientPassword = useMutation(api.projects.resetClientPassword);
  const deleteClientMutation = useMutation(api.projects.deleteClient);

  const [clientActive, setClientActive] = useState(true);
  const [resetPwDialogOpen, setResetPwDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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
            <p className="text-muted-foreground">Access denied.</p>
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
    await updateClient({ token: (typeof window !== "undefined" ? localStorage.getItem("oookea_session") || "" : ""), 
      id: client._id as Id<"users">,
      status: newStatus as "active" | "inactive",
    });
  };

  const handleToggleModule = async (moduleId: string, enabled: boolean) => {
    await toggleModule({ token: (typeof window !== "undefined" ? localStorage.getItem("oookea_session") || "" : ""),  id: moduleId as Id<"modules">, enabled });
  };

  const handleResetPassword = async () => {
    if (!client || !newPassword || newPassword.length < 6) return;
    await resetClientPassword({ token: (typeof window !== "undefined" ? localStorage.getItem("oookea_session") || "" : ""),  id: client._id as Id<"users">, newPassword });
    setResetPwDialogOpen(false);
    setNewPassword("");
  };

  const handleDeleteClient = async () => {
    if (!client) return;
    await deleteClientMutation({ token: (typeof window !== "undefined" ? localStorage.getItem("oookea_session") || "" : ""),  id: client._id as Id<"users"> });
    window.location.href = "/admin/clients";
  };

  // Use actual client status from data
  const isActive = client ? client.status === "active" : clientActive;

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <Link href="/admin/clients" className="flex items-center gap-1 text-primary hover:text-primary">
              <ArrowLeft className="h-4 w-4" />
              Clients
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">{client?.name ?? "Loading…"}</span>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : !client ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-lg font-medium text-foreground">Client not found</p>
              <p className="mt-1 text-sm text-muted-foreground">This client may have been removed.</p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Main Content */}
              <div className="space-y-6 lg:col-span-2">
                {/* Client Info */}
                <Card className="border-border">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">
                          {client.name.split(" ").map((n: string) => n[0]).join("")}
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-foreground">{client.name}</h2>
                          <p className="text-sm text-muted-foreground">{client.company || "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${isActive ? "bg-[#22C55E]/10 text-[#22C55E]" : "bg-[#94A3B8]/10 text-muted-foreground"}`}>
                          {isActive ? "Active" : "Inactive"}
                        </span>
                        <button
                          onClick={handleToggleStatus}
                          className="text-xs text-primary hover:text-primary font-medium"
                        >
                          <ToggleLeft className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    <Separator className="my-4 bg-border" />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase">Email</p>
                        <p className="mt-1 text-sm text-foreground">{client.email}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase">Phone</p>
                        <p className="mt-1 text-sm text-foreground">{client.phone || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase">Company</p>
                        <p className="mt-1 text-sm text-foreground">{client.company || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase">Joined</p>
                        <p className="mt-1 text-sm text-foreground">
                          {new Date(client.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Projects */}
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FolderKanban className="h-4 w-4 text-primary" />
                      Projects ({projects?.length ?? 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {projects === undefined ? (
                      <div className="flex justify-center py-8">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      </div>
                    ) : projects.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">No projects yet.</p>
                    ) : (
                      projects.map((p) => (
                        <div key={p._id} className="flex items-center gap-4 rounded-lg border border-border p-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{p.title}</p>
                            <span className={`inline-flex mt-1 items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[p.status] || "bg-[#94A3B8]/10 text-muted-foreground"}`}>
                              {p.status}
                            </span>
                          </div>
                          <div className="text-right w-24">
                            <p className="text-sm font-medium text-foreground">{p.progress}%</p>
                            <Progress value={p.progress} className="mt-1 h-1.5 bg-muted" />
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Invoices */}
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-4 w-4 text-primary" />
                      Recent Invoices
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {invoices === undefined ? (
                      <div className="flex justify-center py-8">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      </div>
                    ) : invoices.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">No invoices yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {invoices.map((inv) => (
                          <div key={inv._id} className="flex items-center justify-between rounded-lg border border-border p-3">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-mono font-medium text-foreground">{inv.number}</span>
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${invoiceStatusColors[inv.status] || ""}`}>
                                {inv.status}
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-foreground">${inv.total.toLocaleString()}</p>
                              <p className="text-[10px] text-muted-foreground">{new Date(inv.issueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
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
                <Card className="border-border">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <HardDrive className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-semibold text-foreground">Storage</h3>
                    </div>
                    <div className="text-center mb-3">
                      <span className="text-sm text-muted-foreground">Storage info coming soon</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Modules */}
                <Card className="border-border">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Blocks className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-semibold text-foreground">Modules</h3>
                    </div>
                    {modules === undefined ? (
                      <div className="flex justify-center py-4">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      </div>
                    ) : modules.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No modules assigned.</p>
                    ) : (
                      <div className="space-y-3">
                        {modules.map((mod) => (
                          <div key={mod._id} className="flex items-center justify-between">
                            <span className="text-sm text-foreground">{mod.title}</span>
                            <Checkbox
                              checked={mod.enabled}
                              onCheckedChange={(checked) =>
                                handleToggleModule(mod._id, !!checked)
                              }
                              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="border-border">
                  <CardContent className="p-6 space-y-2">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h3>
                    <Button variant="outline" className="w-full justify-start border-border">
                      <Mail className="mr-2 h-4 w-4" />
                      Send Message
                    </Button>
                    <Button variant="outline" className="w-full justify-start border-border">
                      <FileText className="mr-2 h-4 w-4" />
                      Create Invoice
                    </Button>
                    <Button variant="outline" className="w-full justify-start border-border" onClick={() => setResetPwDialogOpen(true)}>
                      <KeyRound className="mr-2 h-4 w-4" />
                      Reset Password
                    </Button>
                    <Button variant="outline" className="w-full justify-start border-border text-destructive hover:text-destructive" onClick={() => setDeleteDialogOpen(true)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Client
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Reset Password Dialog */}
          <Dialog open={resetPwDialogOpen} onOpenChange={setResetPwDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-foreground">Reset Password</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <p className="text-sm text-muted-foreground">
                  Set a new password for <span className="font-medium text-foreground">{client?.name}</span>
                </p>
                <div className="space-y-2">
                  <Label htmlFor="detail-reset-password">New Password</Label>
                  <Input
                    id="detail-reset-password"
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="border-border"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <DialogClose className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-background">
                  Cancel
                </DialogClose>
                <Button
                  className="bg-primary hover:bg-primary/90 text-white"
                  onClick={handleResetPassword}
                  disabled={!newPassword || newPassword.length < 6}
                >
                  Reset Password
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Client Dialog */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-foreground">Delete Client</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete <span className="font-medium text-foreground">{client?.name}</span>? This will permanently remove the client and all their projects, invoices, files, messages, and modules. This action cannot be undone.
                </p>
              </div>
              <DialogFooter className="gap-2">
                <DialogClose className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-background">
                  Cancel
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={handleDeleteClient}
                >
                  Delete Client
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
