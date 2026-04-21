"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/lib/auth";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { InvoiceStatusBadge } from "@/components/invoices/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  Eye,
  Pencil,
  CheckCircle2,
  Trash2,
  FileText,
  DollarSign,
  AlertCircle,
  Clock,
  X,
} from "lucide-react";
import type { Invoice, InvoiceStatus, InvoiceItem } from "@/types";

// ─── Mock Clients ───────────────────────────────────────────────
const clients = [
  "Acme Corp",
  "Globex Inc",
  "Soylent Corp",
  "Initech",
  "Umbrella Corp",
  "Wayne Enterprises",
];

// ─── Mock Data ──────────────────────────────────────────────────
const initialInvoices: Invoice[] = [
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
    client: "Globex Inc",
    items: [
      { id: "i3", description: "Mobile App Development — Sprint 1", quantity: 1, unitPrice: 8000, total: 8000 },
    ],
    subtotal: 8000,
    tax: 800,
    total: 8800,
    notes: "Payment due within 30 days.",
  },
  {
    id: "3",
    number: "INV-2026-003",
    status: "overdue",
    issueDate: "2026-02-01",
    dueDate: "2026-03-01",
    client: "Soylent Corp",
    items: [
      { id: "i4", description: "Brand Identity Package", quantity: 1, unitPrice: 5000, total: 5000 },
      { id: "i5", description: "Social Media Kit", quantity: 1, unitPrice: 2000, total: 2000 },
    ],
    subtotal: 7000,
    tax: 700,
    total: 7700,
    notes: "Overdue. Please remit payment at your earliest convenience.",
  },
  {
    id: "4",
    number: "INV-2026-004",
    status: "paid",
    issueDate: "2025-12-10",
    dueDate: "2026-01-10",
    client: "Initech",
    items: [
      { id: "i6", description: "IT Infrastructure Audit", quantity: 1, unitPrice: 12000, total: 12000 },
    ],
    subtotal: 12000,
    tax: 1200,
    total: 13200,
    notes: "Paid on time. Thank you!",
  },
  {
    id: "5",
    number: "INV-2026-005",
    status: "draft",
    issueDate: "2026-04-15",
    dueDate: "2026-05-15",
    client: "Umbrella Corp",
    items: [
      { id: "i7", description: "Security Compliance Review", quantity: 1, unitPrice: 6000, total: 6000 },
      { id: "i8", description: "Penetration Testing", quantity: 2, unitPrice: 2500, total: 5000 },
    ],
    subtotal: 11000,
    tax: 1100,
    total: 12100,
    notes: "Draft — pending internal review.",
  },
  {
    id: "6",
    number: "INV-2026-006",
    status: "paid",
    issueDate: "2026-01-20",
    dueDate: "2026-02-20",
    client: "Wayne Enterprises",
    items: [
      { id: "i9", description: "Executive Dashboard — Design", quantity: 1, unitPrice: 7500, total: 7500 },
      { id: "i10", description: "Data Visualization Module", quantity: 1, unitPrice: 4500, total: 4500 },
    ],
    subtotal: 12000,
    tax: 1200,
    total: 13200,
    notes: "Paid. Thank you!",
  },
  {
    id: "7",
    number: "INV-2026-007",
    status: "sent",
    issueDate: "2026-04-01",
    dueDate: "2026-05-01",
    client: "Acme Corp",
    items: [
      { id: "i11", description: "AI Marketing Workflow — Phase 2", quantity: 1, unitPrice: 9500, total: 9500 },
    ],
    subtotal: 9500,
    tax: 950,
    total: 10450,
    notes: "Net 30.",
    projectSlug: "ai-marketing-workflow",
  },
  {
    id: "8",
    number: "INV-2026-008",
    status: "overdue",
    issueDate: "2026-01-05",
    dueDate: "2026-02-05",
    client: "Globex Inc",
    items: [
      { id: "i12", description: "Cloud Migration Planning", quantity: 1, unitPrice: 3500, total: 3500 },
    ],
    subtotal: 3500,
    tax: 350,
    total: 3850,
    notes: "Second reminder sent.",
  },
  {
    id: "9",
    number: "INV-2026-009",
    status: "paid",
    issueDate: "2026-02-10",
    dueDate: "2026-03-10",
    client: "Soylent Corp",
    items: [
      { id: "i13", description: "Product Label Design (5 SKUs)", quantity: 5, unitPrice: 800, total: 4000 },
    ],
    subtotal: 4000,
    tax: 400,
    total: 4400,
    notes: "Paid via wire transfer.",
  },
  {
    id: "10",
    number: "INV-2026-010",
    status: "draft",
    issueDate: "2026-04-18",
    dueDate: "2026-05-18",
    client: "Initech",
    items: [
      { id: "i14", description: "Network Monitoring Setup", quantity: 1, unitPrice: 3000, total: 3000 },
      { id: "i15", description: "Staff Training (2 sessions)", quantity: 2, unitPrice: 750, total: 1500 },
    ],
    subtotal: 4500,
    tax: 450,
    total: 4950,
    notes: "Draft. Awaiting client approval on scope.",
  },
];

const statusFilters: { label: string; value: string }[] = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Sent", value: "sent" },
  { label: "Paid", value: "paid" },
  { label: "Overdue", value: "overdue" },
];

// ─── Helpers ────────────────────────────────────────────────────
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Create Invoice Dialog ──────────────────────────────────────
interface LineItemForm {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

function CreateInvoiceDialog({ onCreated }: { onCreated: (inv: Invoice) => void }) {
  const [open, setOpen] = useState(false);
  const [client, setClient] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [taxRate, setTaxRate] = useState("10");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItemForm[]>([
    { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0 },
  ]);

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0 },
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((li) => li.id !== id));
  };

  const updateLineItem = (id: string, field: keyof LineItemForm, value: string | number) => {
    setLineItems((prev) =>
      prev.map((li) => (li.id === id ? { ...li, [field]: value } : li)),
    );
  };

  const subtotal = lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
  const tax = subtotal * (parseFloat(taxRate) || 0) / 100;
  const total = subtotal + tax;

  const handleSubmit = () => {
    if (!client || !dueDate || lineItems.some((li) => !li.description)) return;

    const items: InvoiceItem[] = lineItems.map((li) => ({
      id: crypto.randomUUID(),
      description: li.description,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      total: li.quantity * li.unitPrice,
    }));

    const newInvoice: Invoice = {
      id: crypto.randomUUID(),
      number: `INV-2026-${String(Date.now()).slice(-3)}`,
      status: "draft",
      issueDate: new Date().toISOString().split("T")[0],
      dueDate,
      client,
      items,
      subtotal,
      tax,
      total,
      notes: notes || undefined,
    };

    onCreated(newInvoice);
    setOpen(false);
    // Reset form
    setClient("");
    setDueDate("");
    setTaxRate("10");
    setNotes("");
    setLineItems([{ id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0 }]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="gap-2 bg-[#6366F1] hover:bg-[#4F46E5]">
            <Plus className="h-4 w-4" />
            Create Invoice
          </Button>
        }
      />
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>Fill in the details to create a new invoice.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Client */}
          <div className="grid gap-2">
            <Label htmlFor="invoice-client">Client</Label>
            <select
              id="invoice-client"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1]/50"
            >
              <option value="">Select client…</option>
              {clients.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Due Date + Tax */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="invoice-due">Due Date</Label>
              <Input
                id="invoice-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="border-[#E2E8F0]"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invoice-tax">Tax Rate (%)</Label>
              <Input
                id="invoice-tax"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="border-[#E2E8F0]"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="grid gap-2">
            <Label>Line Items</Label>
            <div className="space-y-2">
              {lineItems.map((li, idx) => (
                <div key={li.id} className="flex items-start gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Description"
                      value={li.description}
                      onChange={(e) => updateLineItem(li.id, "description", e.target.value)}
                      className="border-[#E2E8F0]"
                    />
                  </div>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={li.quantity}
                    onChange={(e) => updateLineItem(li.id, "quantity", parseInt(e.target.value) || 0)}
                    className="w-20 border-[#E2E8F0]"
                  />
                  <Input
                    type="number"
                    min="0"
                    placeholder="Price"
                    value={li.unitPrice || ""}
                    onChange={(e) => updateLineItem(li.id, "unitPrice", parseFloat(e.target.value) || 0)}
                    className="w-28 border-[#E2E8F0]"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mt-0.5 h-9 w-9 shrink-0 text-[#94A3B8] hover:text-[#EF4444]"
                    onClick={() => removeLineItem(li.id)}
                    disabled={lineItems.length <= 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-1 gap-1.5 border-dashed border-[#E2E8F0] text-[#64748B]"
              onClick={addLineItem}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Line Item
            </Button>
          </div>

          {/* Notes */}
          <div className="grid gap-2">
            <Label htmlFor="invoice-notes">Notes</Label>
            <textarea
              id="invoice-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes…"
              rows={3}
              className="flex w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm shadow-sm placeholder:text-[#94A3B8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1]/50"
            />
          </div>

          {/* Totals */}
          <div className="rounded-lg bg-[#F8FAFC] p-4 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-[#64748B]">Subtotal</span>
              <span className="text-[#0F172A]">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#64748B]">Tax ({taxRate}%)</span>
              <span className="text-[#0F172A]">{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between border-t border-[#E2E8F0] pt-1.5 text-base font-semibold">
              <span className="text-[#0F172A]">Total</span>
              <span className="text-[#6366F1]">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            className="bg-[#6366F1] hover:bg-[#4F46E5]"
            onClick={handleSubmit}
            disabled={!client || !dueDate || lineItems.some((li) => !li.description)}
          >
            Create Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ──────────────────────────────────────────────────
export default function AdminInvoicesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);

  // Admin guard
  if (user?.role !== "admin") {
    if (typeof window !== "undefined") router.push("/dashboard");
    return null;
  }

  // Stats
  const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0);
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0);
  const totalOutstanding = invoices.filter((i) => i.status === "sent").reduce((s, i) => s + i.total, 0);
  const totalOverdue = invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + i.total, 0);

  const statusCounts: Record<string, number> = {
    all: invoices.length,
    draft: invoices.filter((i) => i.status === "draft").length,
    sent: invoices.filter((i) => i.status === "sent").length,
    paid: invoices.filter((i) => i.status === "paid").length,
    overdue: invoices.filter((i) => i.status === "overdue").length,
  };

  const filtered = invoices.filter((inv) => {
    const matchesSearch =
      inv.number.toLowerCase().includes(search.toLowerCase()) ||
      inv.client.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || inv.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleMarkPaid = (id: string) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, status: "paid" as InvoiceStatus } : inv)),
    );
  };

  const handleDelete = (id: string) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
  };

  const handleCreated = (inv: Invoice) => {
    setInvoices((prev) => [inv, ...prev]);
  };

  const stats = [
    { label: "Total Invoiced", value: formatCurrency(totalInvoiced), icon: DollarSign, color: "text-[#6366F1]", bg: "bg-[#6366F1]/10" },
    { label: "Paid", value: formatCurrency(totalPaid), icon: CheckCircle2, color: "text-[#22C55E]", bg: "bg-[#22C55E]/10" },
    { label: "Outstanding", value: formatCurrency(totalOutstanding), icon: Clock, color: "text-[#F59E0B]", bg: "bg-[#F59E0B]/10" },
    { label: "Overdue", value: formatCurrency(totalOverdue), icon: AlertCircle, color: "text-[#EF4444]", bg: "bg-[#EF4444]/10" },
  ];

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#0F172A]">Invoice Management</h1>
              <p className="mt-1 text-[#64748B]">
                Create, manage, and track all client invoices.
              </p>
            </div>
            <CreateInvoiceDialog onCreated={handleCreated} />
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.label} className="border-[#E2E8F0] bg-white shadow-sm">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stat.bg}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#64748B]">{stat.label}</p>
                    <p className="text-lg font-bold text-[#0F172A]">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
                      {statusCounts[s.value]}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
              <Input
                placeholder="Search by invoice # or client…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-64 pl-9 border-[#E2E8F0] bg-white"
              />
            </div>
          </div>

          {/* Table */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F1F5F9]">
                <FileText className="h-8 w-8 text-[#94A3B8]" />
              </div>
              <p className="text-lg font-medium text-[#0F172A]">No invoices found</p>
              <p className="mt-1 text-sm text-[#64748B]">Try adjusting your search or filters.</p>
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
                      Client
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
                      <TableCell className="text-[#0F172A]">{invoice.client}</TableCell>
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
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 text-[#6366F1] hover:bg-[#6366F1]/5 hover:text-[#4F46E5]"
                            onClick={() => router.push(`/invoices/${invoice.id}`)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                          {invoice.status !== "paid" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1 text-[#22C55E] hover:bg-[#22C55E]/5"
                              onClick={() => handleMarkPaid(invoice.id)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Paid
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 text-[#EF4444] hover:bg-[#EF4444]/5"
                            onClick={() => handleDelete(invoice.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
