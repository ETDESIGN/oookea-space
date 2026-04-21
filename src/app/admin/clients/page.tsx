"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Search,
  Plus,
  Eye,
  Pencil,
  Power,
  PowerOff,
  Building2,
  Mail,
} from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

// ─── Component ──────────────────────────────────────────────────

export default function ClientsManagementPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newClient, setNewClient] = useState({
    name: "",
    email: "",
    password: "",
    company: "",
  });

  const clients = useQuery(api.projects.listClients, {});
  const projects = useQuery(api.projects.listProjects, {});
  const createClient = useMutation(api.projects.createClient);
  const updateClient = useMutation(api.projects.updateClient);

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  if (!user || user.role !== "admin") {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  const isLoading = clients === undefined;

  // Build project count map
  const projectCountMap = new Map<string, number>();
  if (projects) {
    for (const p of projects) {
      const cid = p.clientId;
      projectCountMap.set(cid, (projectCountMap.get(cid) || 0) + 1);
    }
  }

  const filteredClients = (clients ?? []).filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.company ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "all" || c.status === filter;
    return matchesSearch && matchesFilter;
  });

  const activeCount = (clients ?? []).filter((c) => c.status === "active").length;
  const inactiveCount = (clients ?? []).filter((c) => c.status === "inactive").length;

  const toggleStatus = async (clientId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    await updateClient({
      id: clientId as Id<"users">,
      status: newStatus as "active" | "inactive",
    });
  };

  const handleAddClient = async () => {
    if (!newClient.name || !newClient.email) return;
    await createClient({
      name: newClient.name,
      email: newClient.email,
      password: newClient.password || "Welcome1!",
      company: newClient.company || undefined,
    });
    setNewClient({ name: "", email: "", password: "", company: "" });
    setDialogOpen(false);
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Client Management
              </h1>
              <p className="mt-1 text-muted-foreground">
                Manage all portal clients, their projects, and access.
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger className="bg-primary hover:bg-primary/90 text-white gap-2 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium">
                <Plus className="h-4 w-4" />
                Add Client
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Add New Client</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="client-name">Full Name</Label>
                    <Input
                      id="client-name"
                      placeholder="John Doe"
                      value={newClient.name}
                      onChange={(e) =>
                        setNewClient((p) => ({ ...p, name: e.target.value }))
                      }
                      className="border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-email">Email</Label>
                    <Input
                      id="client-email"
                      type="email"
                      placeholder="john@example.com"
                      value={newClient.email}
                      onChange={(e) =>
                        setNewClient((p) => ({ ...p, email: e.target.value }))
                      }
                      className="border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-password">Password</Label>
                    <Input
                      id="client-password"
                      type="password"
                      placeholder="••••••••"
                      value={newClient.password}
                      onChange={(e) =>
                        setNewClient((p) => ({ ...p, password: e.target.value }))
                      }
                      className="border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-company">Company</Label>
                    <Input
                      id="client-company"
                      placeholder="Acme Corp"
                      value={newClient.company}
                      onChange={(e) =>
                        setNewClient((p) => ({ ...p, company: e.target.value }))
                      }
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
                    onClick={handleAddClient}
                    disabled={!newClient.name || !newClient.email}
                  >
                    Create Client
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-border bg-card shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Clients</p>
                  <p className="text-xl font-bold text-foreground">{clients?.length ?? "—"}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#22C55E]/10">
                  <Power className="h-5 w-5 text-[#22C55E]" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-xl font-bold text-foreground">{activeCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#94A3B8]/10">
                  <PowerOff className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Inactive</p>
                  <p className="text-xl font-bold text-foreground">{inactiveCount}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search + Filter Tabs */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList className="bg-muted">
                <TabsTrigger
                  value="all"
                  className="data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm"
                >
                  All
                </TabsTrigger>
                <TabsTrigger
                  value="active"
                  className="data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm"
                >
                  Active
                </TabsTrigger>
                <TabsTrigger
                  value="inactive"
                  className="data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm"
                >
                  Inactive
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search clients…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-64 pl-9 border-border bg-card"
              />
            </div>
          </div>

          {/* Client Table */}
          <Card className="border-border bg-card shadow-sm">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center py-16">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                    <Search className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-medium text-foreground">
                    No clients found
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try adjusting your search or filters.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden md:table-cell">Email</TableHead>
                      <TableHead className="hidden sm:table-cell">Company</TableHead>
                      <TableHead className="text-center">Projects</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => {
                      const pCount = projectCountMap.get(client._id) ?? 0;
                      return (
                        <TableRow key={client._id} className="group">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                                {client.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .slice(0, 2)}
                              </div>
                              <span className="font-medium text-foreground">
                                {client.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                              <Mail className="h-3.5 w-3.5" />
                              {client.email}
                            </span>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                              <Building2 className="h-3.5 w-3.5" />
                              {client.company || "—"}
                            </span>
                          </TableCell>
                          <TableCell className="text-center font-medium text-foreground">
                            {pCount}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={`rounded-full border-0 ${
                                client.status === "active"
                                  ? "bg-[#22C55E]/10 text-[#22C55E]"
                                  : "bg-[#94A3B8]/10 text-muted-foreground"
                              }`}
                            >
                              {client.status === "active" ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Link href={`/admin/clients/${client._id}`}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 ${
                                  client.status === "active"
                                    ? "text-muted-foreground hover:text-destructive"
                                    : "text-[#22C55E] hover:text-[#22C55E]"
                                }`}
                                onClick={() => toggleStatus(client._id, client.status)}
                                title={
                                  client.status === "active"
                                    ? "Deactivate"
                                    : "Activate"
                                }
                              >
                                {client.status === "active" ? (
                                  <PowerOff className="h-4 w-4" />
                                ) : (
                                  <Power className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
