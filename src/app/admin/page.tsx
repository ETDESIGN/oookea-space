"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Users,
  FolderKanban,
  DollarSign,
  AlertCircle,
  Plus,
  FileText,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import Link from "next/link";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

// ─── Component ──────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  const clients = useQuery(api.projects.listClients, {});
  const projects = useQuery(api.projects.listProjects, {});
  const invoices = useQuery(api.projects.listInvoices, {});

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

  const isLoading = clients === undefined || projects === undefined || invoices === undefined;

  const totalClients = clients?.length ?? 0;
  const activeProjects = projects?.filter((p) => p.status === "active").length ?? 0;
  const totalRevenue = invoices?.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0) ?? 0;
  const outstanding = invoices?.filter((i) => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + i.total, 0) ?? 0;

  const stats = [
    {
      title: "Total Clients",
      value: isLoading ? "—" : String(totalClients),
      icon: Users,
      color: "bg-primary/10 text-primary",
    },
    {
      title: "Active Projects",
      value: isLoading ? "—" : String(activeProjects),
      icon: FolderKanban,
      color: "bg-[#22C55E]/10 text-[#22C55E]",
    },
    {
      title: "Revenue (Paid)",
      value: isLoading ? "—" : `$${totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: "bg-[#F59E0B]/10 text-[#F59E0B]",
    },
    {
      title: "Outstanding",
      value: isLoading ? "—" : `$${outstanding.toLocaleString()}`,
      icon: AlertCircle,
      color: "bg-[#EF4444]/10 text-destructive",
    },
  ];

  const statusColor: Record<string, string> = {
    active: "bg-[#22C55E]/10 text-[#22C55E]",
    inactive: "bg-[#94A3B8]/10 text-muted-foreground",
    paid: "bg-[#22C55E]/10 text-[#22C55E]",
    sent: "bg-primary/10 text-primary",
    overdue: "bg-[#EF4444]/10 text-destructive",
    draft: "bg-[#94A3B8]/10 text-muted-foreground",
  };

  // Recent clients (up to 5)
  const recentClients = (clients ?? []).slice(0, 5);
  // Recent invoices (up to 5)
  const recentInvoices = (invoices ?? []).slice(0, 5);

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          {/* Welcome */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Welcome back, {user.name} 👋
            </h1>
            <p className="mt-1 text-muted-foreground">
              Here&apos;s an overview of your client portal activity.
            </p>
          </div>

          {/* Stat Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.title} className="border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                      <p className="text-3xl font-bold tracking-tight text-foreground">
                        {stat.value}
                      </p>
                    </div>
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.color}`}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Revenue Chart Placeholder + Quick Actions */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Revenue Chart Placeholder */}
            <Card className="border-border bg-card shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Revenue Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background">
                  <BarChart3 className="h-10 w-10 text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium text-muted-foreground">
                    Revenue chart coming soon
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Monthly revenue breakdown will appear here
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-foreground">
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <Link
                  href="/admin/clients"
                  className="flex items-center gap-3 rounded-lg bg-primary/10 p-3 text-primary transition-colors hover:bg-primary/20"
                >
                  <Plus className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-medium">Add Client</span>
                </Link>
                <Link
                  href="/admin/invoices"
                  className="flex items-center gap-3 rounded-lg bg-[#22C55E]/10 p-3 text-[#22C55E] transition-colors hover:bg-[#22C55E]/20"
                >
                  <FileText className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-medium">Create Invoice</span>
                </Link>
                <Link
                  href="/admin/projects"
                  className="flex items-center gap-3 rounded-lg bg-[#F59E0B]/10 p-3 text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/20"
                >
                  <FolderKanban className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-medium">Create Project</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Clients + Recent Invoices */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent Clients */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Recent Clients
                  </CardTitle>
                  <Link href="/admin/clients">
                    <Button variant="ghost" size="sm" className="text-primary">
                      View all
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : recentClients.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No clients yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden sm:table-cell">Email</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentClients.map((client) => (
                        <TableRow key={client._id} className="cursor-pointer">
                          <TableCell>
                            <Link href={`/admin/clients/${client._id}`} className="font-medium text-foreground hover:text-primary">
                              {client.name}
                            </Link>
                          </TableCell>
                          <TableCell className="hidden text-muted-foreground sm:table-cell">
                            {client.email}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              className={`rounded-full border-0 ${statusColor[client.status] || ""}`}
                            >
                              {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Recent Invoices */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Recent Invoices
                  </CardTitle>
                  <Link href="/admin/invoices">
                    <Button variant="ghost" size="sm" className="text-primary">
                      View all
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : recentInvoices.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No invoices yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentInvoices.map((inv) => (
                        <TableRow key={inv._id}>
                          <TableCell className="font-medium text-foreground">
                            {inv.number}
                          </TableCell>
                          <TableCell className="text-right font-medium text-foreground">
                            ${inv.total.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              className={`rounded-full border-0 ${statusColor[inv.status] || ""}`}
                            >
                              {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
