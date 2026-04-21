"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/lib/auth";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { InvoiceStatusBadge } from "@/components/invoices/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Eye, Download, FileText } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

const statusFilters: { label: string; value: string }[] = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Sent", value: "sent" },
  { label: "Paid", value: "paid" },
  { label: "Overdue", value: "overdue" },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function InvoicesPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const clientId = user?.role === "admin" ? undefined : (user?.id as Id<"users">);
  const invoices = useQuery(
    api.projects.listInvoices,
    clientId ? { clientId } : {}
  );

  const invoiceList = invoices ?? [];

  const filtered = invoiceList.filter((inv) => {
    const matchesSearch =
      inv.number.toLowerCase().includes(search.toLowerCase()) ||
      (inv.currency ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || inv.status === filter;
    return matchesSearch && matchesFilter;
  });

  const statusCounts: Record<string, number> = {
    all: invoiceList.length,
    draft: invoiceList.filter((i) => i.status === "draft").length,
    sent: invoiceList.filter((i) => i.status === "sent").length,
    paid: invoiceList.filter((i) => i.status === "paid").length,
    overdue: invoiceList.filter((i) => i.status === "overdue").length,
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#0F172A]">Invoices</h1>
              <p className="mt-1 text-[#64748B]">
                View and manage your invoices and payment history.
              </p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
              <Input
                placeholder="Search invoices…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-64 pl-9 border-[#E2E8F0] bg-white"
              />
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="bg-[#F1F5F9]">
              {statusFilters.map((s) => (
                <TabsTrigger
                  key={s.value}
                  value={s.value}
                  className="data-[state=active]:bg-white data-[state=active]:text-[#6366F1] data-[state=active]:shadow-sm"
                >
                  {s.label}
                  <span className="ml-1.5 text-xs text-[#94A3B8]">
                    {statusCounts[s.value] ?? 0}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Loading */}
          {invoices === undefined && (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E2E8F0] border-t-[#6366F1]" />
            </div>
          )}

          {/* Table */}
          {invoices !== undefined && filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F1F5F9]">
                <FileText className="h-8 w-8 text-[#94A3B8]" />
              </div>
              <p className="text-lg font-medium text-[#0F172A]">No invoices found</p>
              <p className="mt-1 text-sm text-[#64748B]">
                Try adjusting your search or filters.
              </p>
            </div>
          ) : invoices !== undefined ? (
            <div className="rounded-xl border border-[#E2E8F0] bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#E2E8F0] hover:bg-transparent">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                      Invoice #
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                      Issue Date
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                      Due Date
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                      Amount
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                      Status
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-[#64748B] text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((invoice) => (
                    <TableRow
                      key={invoice._id}
                      className="border-b border-[#E2E8F0] last:border-0 hover:bg-[#F8FAFC]"
                    >
                      <TableCell className="font-medium text-[#0F172A]">
                        {invoice.number}
                      </TableCell>
                      <TableCell className="text-[#64748B]">
                        {formatDate(invoice.issueDate)}
                      </TableCell>
                      <TableCell className="text-[#64748B]">
                        {formatDate(invoice.dueDate)}
                      </TableCell>
                      <TableCell className="font-semibold text-[#0F172A]">
                        {formatCurrency(invoice.total)}
                      </TableCell>
                      <TableCell>
                        <InvoiceStatusBadge status={invoice.status as "draft" | "sent" | "paid" | "overdue"} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`/invoices/${invoice._id}`}
                            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-[#6366F1] hover:text-[#4F46E5] hover:bg-[#6366F1]/5 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </a>
                          {invoice.pdfUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]"
                              onClick={() => window.open(invoice.pdfUrl, "_blank")}
                            >
                              <Download className="h-3.5 w-3.5" />
                              PDF
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
