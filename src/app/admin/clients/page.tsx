"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  HardDrive,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────

interface Client {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  projects: number;
  storageUsed: number;
  storageTotal: number;
  status: "active" | "inactive";
  joinedDate: string;
}

// ─── Mock Data ──────────────────────────────────────────────────

const initialClients: Client[] = [
  {
    id: "1",
    name: "Marie Dupont",
    email: "marie@acmecorp.com",
    company: "Acme Corp",
    phone: "+1 (555) 101-2001",
    projects: 3,
    storageUsed: 340,
    storageTotal: 500,
    status: "active",
    joinedDate: "2025-09-12",
  },
  {
    id: "2",
    name: "James Wilson",
    email: "hello@globex.io",
    company: "Globex Inc",
    phone: "+1 (555) 202-3002",
    projects: 2,
    storageUsed: 180,
    storageTotal: 500,
    status: "active",
    joinedDate: "2025-11-03",
  },
  {
    id: "3",
    name: "Lena Chen",
    email: "team@soylent.dev",
    company: "Soylent Labs",
    phone: "+1 (555) 303-4003",
    projects: 1,
    storageUsed: 45,
    storageTotal: 500,
    status: "active",
    joinedDate: "2026-01-18",
  },
  {
    id: "4",
    name: "Peter Gibbons",
    email: "info@initech.co",
    company: "Initech Systems",
    phone: "+1 (555) 404-5004",
    projects: 2,
    storageUsed: 60,
    storageTotal: 500,
    status: "inactive",
    joinedDate: "2025-06-22",
  },
  {
    id: "5",
    name: "Alice Morgan",
    email: "admin@umbrella.net",
    company: "Umbrella Corp",
    phone: "+1 (555) 505-6005",
    projects: 4,
    storageUsed: 410,
    storageTotal: 500,
    status: "active",
    joinedDate: "2025-04-10",
  },
  {
    id: "6",
    name: "Carlos Rivera",
    email: "carlos@vertexai.com",
    company: "Vertex AI",
    phone: "+1 (555) 606-7006",
    projects: 1,
    storageUsed: 20,
    storageTotal: 500,
    status: "active",
    joinedDate: "2026-03-05",
  },
  {
    id: "7",
    name: "Sarah Kim",
    email: "sarah@novahealth.org",
    company: "Nova Health",
    phone: "+1 (555) 707-8007",
    projects: 0,
    storageUsed: 0,
    storageTotal: 500,
    status: "inactive",
    joinedDate: "2025-12-01",
  },
  {
    id: "8",
    name: "Tom Baker",
    email: "tom@bluecore.io",
    company: "Bluecore Digital",
    phone: "+1 (555) 808-9008",
    projects: 2,
    storageUsed: 125,
    storageTotal: 500,
    status: "active",
    joinedDate: "2026-02-14",
  },
];

// ─── Component ──────────────────────────────────────────────────

export default function ClientsManagementPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newClient, setNewClient] = useState({
    name: "",
    email: "",
    password: "",
    company: "",
  });

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
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#6366F1] border-t-transparent" />
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "all" || c.status === filter;
    return matchesSearch && matchesFilter;
  });

  const activeCount = clients.filter((c) => c.status === "active").length;
  const inactiveCount = clients.filter((c) => c.status === "inactive").length;

  const toggleStatus = (id: string) => {
    setClients((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, status: c.status === "active" ? "inactive" : "active" }
          : c
      )
    );
  };

  const handleAddClient = () => {
    if (!newClient.name || !newClient.email) return;
    const id = String(clients.length + 1);
    const client: Client = {
      id,
      name: newClient.name,
      email: newClient.email,
      company: newClient.company || "—",
      phone: "—",
      projects: 0,
      storageUsed: 0,
      storageTotal: 500,
      status: "active",
      joinedDate: new Date().toISOString().split("T")[0],
    };
    setClients((prev) => [...prev, client]);
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
              <h1 className="text-2xl font-bold text-[#0F172A]">
                Client Management
              </h1>
              <p className="mt-1 text-[#64748B]">
                Manage all portal clients, their projects, and access.
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger className="bg-[#6366F1] hover:bg-[#5558E6] text-white gap-2 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium">
                <Plus className="h-4 w-4" />
                Add Client
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-[#0F172A]">Add New Client</DialogTitle>
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
                      className="border-[#E2E8F0]"
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
                      className="border-[#E2E8F0]"
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
                      className="border-[#E2E8F0]"
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
                      className="border-[#E2E8F0]"
                    />
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <DialogClose className="inline-flex items-center justify-center rounded-lg border border-[#E2E8F0] px-4 py-2 text-sm font-medium hover:bg-[#F8FAFC]">
                    Cancel
                  </DialogClose>
                  <Button
                    className="bg-[#6366F1] hover:bg-[#5558E6] text-white"
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
            <Card className="border-[#E2E8F0] bg-white shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6366F1]/10">
                  <Users className="h-5 w-5 text-[#6366F1]" />
                </div>
                <div>
                  <p className="text-sm text-[#64748B]">Total Clients</p>
                  <p className="text-xl font-bold text-[#0F172A]">{clients.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-[#E2E8F0] bg-white shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#22C55E]/10">
                  <Power className="h-5 w-5 text-[#22C55E]" />
                </div>
                <div>
                  <p className="text-sm text-[#64748B]">Active</p>
                  <p className="text-xl font-bold text-[#0F172A]">{activeCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-[#E2E8F0] bg-white shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#94A3B8]/10">
                  <PowerOff className="h-5 w-5 text-[#94A3B8]" />
                </div>
                <div>
                  <p className="text-sm text-[#64748B]">Inactive</p>
                  <p className="text-xl font-bold text-[#0F172A]">{inactiveCount}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search + Filter Tabs */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList className="bg-[#F1F5F9]">
                <TabsTrigger
                  value="all"
                  className="data-[state=active]:bg-white data-[state=active]:text-[#6366F1] data-[state=active]:shadow-sm"
                >
                  All
                </TabsTrigger>
                <TabsTrigger
                  value="active"
                  className="data-[state=active]:bg-white data-[state=active]:text-[#6366F1] data-[state=active]:shadow-sm"
                >
                  Active
                </TabsTrigger>
                <TabsTrigger
                  value="inactive"
                  className="data-[state=active]:bg-white data-[state=active]:text-[#6366F1] data-[state=active]:shadow-sm"
                >
                  Inactive
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
              <Input
                placeholder="Search clients…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-64 pl-9 border-[#E2E8F0] bg-white"
              />
            </div>
          </div>

          {/* Client Table */}
          <Card className="border-[#E2E8F0] bg-white shadow-sm">
            <CardContent className="p-0">
              {filteredClients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1F5F9]">
                    <Search className="h-7 w-7 text-[#94A3B8]" />
                  </div>
                  <p className="text-lg font-medium text-[#0F172A]">
                    No clients found
                  </p>
                  <p className="mt-1 text-sm text-[#64748B]">
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
                      <TableHead className="hidden lg:table-cell text-center">Storage</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => {
                      const storagePct = Math.round(
                        (client.storageUsed / client.storageTotal) * 100
                      );
                      return (
                        <TableRow key={client.id} className="group">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#6366F1]/10 text-sm font-semibold text-[#6366F1]">
                                {client.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .slice(0, 2)}
                              </div>
                              <span className="font-medium text-[#0F172A]">
                                {client.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="flex items-center gap-1.5 text-[#64748B]">
                              <Mail className="h-3.5 w-3.5" />
                              {client.email}
                            </span>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <span className="flex items-center gap-1.5 text-[#64748B]">
                              <Building2 className="h-3.5 w-3.5" />
                              {client.company}
                            </span>
                          </TableCell>
                          <TableCell className="text-center font-medium text-[#0F172A]">
                            {client.projects}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 rounded-full bg-[#E2E8F0]">
                                <div
                                  className="h-full rounded-full bg-[#6366F1] transition-all"
                                  style={{ width: `${storagePct}%` }}
                                />
                              </div>
                              <span className="text-xs text-[#64748B]">
                                {client.storageUsed} MB
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={`rounded-full border-0 ${
                                client.status === "active"
                                  ? "bg-[#22C55E]/10 text-[#22C55E]"
                                  : "bg-[#94A3B8]/10 text-[#94A3B8]"
                              }`}
                            >
                              {client.status === "active" ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Link href={`/admin/clients/${client.id}`}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-[#64748B] hover:text-[#6366F1]"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-[#64748B] hover:text-[#6366F1]"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 ${
                                  client.status === "active"
                                    ? "text-[#94A3B8] hover:text-[#EF4444]"
                                    : "text-[#22C55E] hover:text-[#22C55E]"
                                }`}
                                onClick={() => toggleStatus(client.id)}
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
