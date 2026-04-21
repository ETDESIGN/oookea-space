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
import type { Invoice, InvoiceStatus } from "@/types";

const mockInvoices: Invoice[] = [
  {
    id: "1",
    number: "INV-2026-001",
    status: "paid",
    issueDate: "2026-01-15",
    dueDate: "2026-02-15",
    client: "Acme Corp",
    items: [
      { id: "i1", description: "Website Redesign — Phase 1", quantity: 1, unitPrice: 4500, total: 4500 },
      { id: "i2", description: "UI Style Guide", quantity: 1, unitPrice: 1500, total: 1500 },
    ],
    subtotal: 6000,
    tax: 600,
    total: 6600,
    notes: "Thank you for your business!",
    projectSlug: "website-redesign",
  },
  {
    id: "2",
    number: "INV-2026-002",
    status: "sent",
    issueDate: "2026-03-01",
    dueDate: "2026-04-01",
    client: "Acme Corp",
    items: [
      { id: "i3", description: "Brand Identity Package", quantity: 1, unitPrice: 3500, total: 3500 },
      { id: "i4", description: "Social Media Kit", quantity: 1, unitPrice: 1200, total: 1200 },
      { id: "i5", description: "Brand Guidelines PDF", quantity: 1, unitPrice: 800, total: 800 },
    ],
    subtotal: 5500,
    tax: 550,
    total: 6050,
    notes: "Payment due within 30 days.",
    projectSlug: "brand-identity",
  },
  {
    id: "3",
    number: "INV-2026-003",
    status: "overdue",
    issueDate: "2026-02-01",
    dueDate: "2026-03-01",
    client: "Acme Corp",
    items: [
      { id: "i6", description: "AI Marketing Workflow — Setup", quantity: 1, unitPrice: 5000, total: 5000 },
    ],
    subtotal: 5000,
    tax: 500,
    total: 5500,
    notes: "Overdue. Please remit payment at your earliest convenience.",
    projectSlug: "ai-marketing-workflow",
  },
  {
    id: "4",
    number: "INV-2026-004",
    status: "draft",
    issueDate: "2026-04-10",
    dueDate: "2026-05-10",
    client: "Acme Corp",
    items: [
      { id: "i7", description: "Product Sourcing Platform — Architecture", quantity: 1, unitPrice: 3000, total: 3000 },
      { id: "i8", description: "Supplier Database Design", quantity: 1, unitPrice: 2000, total: 2000 },
    ],
    subtotal: 5000,
    tax: 500,
    total: 5500,
    notes: "Draft — pending review before sending.",
    projectSlug: "product-sourcing",
  },
  {
    id: "5",
    number: "INV-2026-005",
    status: "sent",
    issueDate: "2026-04-05",
    dueDate: "2026-05-05",
    client: "Acme Corp",
    items: [
      { id: "i9", description: "OpenClaw AI Agent — Environment Setup", quantity: 1, unitPrice: 2500, total: 2500 },
      { id: "i10", description: "Agent Configuration", quantity: 1, unitPrice: 2000, total: 2000 },
      { id: "i11", description: "Testing & Deployment", quantity: 1, unitPrice: 1500, total: 1500 },
    ],
    subtotal: 6000,
    tax: 600,
    total: 6600,
    notes: "Net 30 payment terms.",
    projectSlug: "openclaw-setup",
  },
  {
    id: "6",
    number: "INV-2026-006",
    status: "paid",
    issueDate: "2025-12-01",
    dueDate: "2025-12-31",
    client: "Acme Corp",
    items: [
      { id: "i12", description: "Initial Consultation & Strategy", quantity: 2, unitPrice: 750, total: 1500 },
    ],
    subtotal: 1500,
    tax: 150,
    total: 1650,
    notes: "Paid. Thank you!",
  },
];

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

  const filtered = mockInvoices.filter((inv) => {
    const matchesSearch =
      inv.number.toLowerCase().includes(search.toLowerCase()) ||
      inv.client.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || inv.status === filter;
    return matchesSearch && matchesFilter;
  });

  const statusCounts = {
    all: mockInvoices.length,
    draft: mockInvoices.filter((i) => i.status === "draft").length,
    sent: mockInvoices.filter((i) => i.status === "sent").length,
    paid: mockInvoices.filter((i) => i.status === "paid").length,
    overdue: mockInvoices.filter((i) => i.status === "overdue").length,
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
                    {statusCounts[s.value as keyof typeof statusCounts]}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Table */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F1F5F9]">
                <FileText className="h-8 w-8 text-[#94A3B8]" />
              </div>
              <p className="text-lg font-medium text-[#0F172A]">No invoices found</p>
              <p className="mt-1 text-sm text-[#64748B]">
                Try adjusting your search or filters.
              </p>
            </div>
          ) : (
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
                      key={invoice.id}
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
                        <InvoiceStatusBadge status={invoice.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`/invoices/${invoice.id}`}
                            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-[#6366F1] hover:text-[#4F46E5] hover:bg-[#6366F1]/5 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </a>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]"
                            onClick={() => {
                              /* PDF download placeholder */
                            }}
                          >
                            <Download className="h-3.5 w-3.5" />
                            PDF
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
