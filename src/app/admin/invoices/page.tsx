"use client";

import { useState } from "react";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { InvoiceStatusBadge } from "@/components/invoices/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Search, Plus, Eye, CheckCircle2, Trash2, FileText, DollarSign, AlertCircle, Clock, X,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

const statusFilters = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Sent", value: "sent" },
  { label: "Paid", value: "paid" },
  { label: "Overdue", value: "overdue" },
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

interface LineItemForm {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export default function AdminInvoicesPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newClient, setNewClient] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newTaxRate, setNewTaxRate] = useState("10");
  const [newNotes, setNewNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItemForm[]>([
    { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0 },
  ]);

  const invoices = useQuery(api.projects.listInvoices, { token: (typeof window !== "undefined" ? localStorage.getItem("oookea_session") || "" : ""), });
  const clients = useQuery(api.projects.listClients, { token: (typeof window !== "undefined" ? localStorage.getItem("oookea_session") || "" : ""), });
  const createInvoice = useMutation(api.projects.createInvoice);
  const updateStatus = useMutation(api.projects.updateInvoiceStatus);

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

  const invoiceList = invoices ?? [];
  const totalInvoiced = invoiceList.reduce((s, i) => s + i.total, 0);
  const totalPaid = invoiceList.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0);
  const totalOutstanding = invoiceList.filter((i) => i.status === "sent").reduce((s, i) => s + i.total, 0);
  const totalOverdue = invoiceList.filter((i) => i.status === "overdue").reduce((s, i) => s + i.total, 0);

  const statusCounts: Record<string, number> = {
    all: invoiceList.length,
    draft: invoiceList.filter((i) => i.status === "draft").length,
    sent: invoiceList.filter((i) => i.status === "sent").length,
    paid: invoiceList.filter((i) => i.status === "paid").length,
    overdue: invoiceList.filter((i) => i.status === "overdue").length,
  };

  const filtered = invoiceList.filter((inv) => {
    const matchesSearch =
      inv.number.toLowerCase().includes(search.toLowerCase()) ||
      (inv as any).clientId?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || inv.status === filter;
    return matchesSearch && matchesFilter;
  });

  const subtotal = lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
  const tax = subtotal * (parseFloat(newTaxRate) || 0) / 100;
  const total = subtotal + tax;

  const handleCreate = async () => {
    if (!newClient || !newDueDate) return;
    await createInvoice({ token: (typeof window !== "undefined" ? localStorage.getItem("oookea_session") || "" : ""), 
      number: `INV-2026-${String(Date.now()).slice(-3)}`,
      clientId: newClient as Id<"users">,
      issueDate: new Date().toISOString().split("T")[0],
      dueDate: newDueDate,
      items: lineItems
        .filter((li) => li.description)
        .map((li) => ({
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          total: li.quantity * li.unitPrice,
        })),
      subtotal,
      taxRate: parseFloat(newTaxRate) || 0,
      taxAmount: tax,
      total,
      notes: newNotes || undefined,
    });
    setDialogOpen(false);
    setNewClient("");
    setNewDueDate("");
    setNewTaxRate("10");
    setNewNotes("");
    setLineItems([{ id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0 }]);
  };

  const stats = [
    { label: "Total Invoiced", value: formatCurrency(totalInvoiced), icon: DollarSign, color: "text-primary", bg: "bg-primary/10" },
    { label: "Paid", value: formatCurrency(totalPaid), icon: CheckCircle2, color: "text-[#22C55E]", bg: "bg-[#22C55E]/10" },
    { label: "Outstanding", value: formatCurrency(totalOutstanding), icon: Clock, color: "text-[#F59E0B]", bg: "bg-[#F59E0B]/10" },
    { label: "Overdue", value: formatCurrency(totalOverdue), icon: AlertCircle, color: "text-destructive", bg: "bg-[#EF4444]/10" },
  ];

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Invoice Management</h1>
              <p className="mt-1 text-muted-foreground">Create, manage, and track all client invoices.</p>
            </div>
            <Button className="gap-2 bg-primary hover:bg-primary/90" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Create Invoice
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.label} className="border-border shadow-sm">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stat.bg}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-lg font-bold text-foreground">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList className="bg-muted">
                {statusFilters.map((s) => (
                  <TabsTrigger key={s.value} value={s.value} className="data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">
                    {s.label}
                    <span className="ml-1.5 text-xs text-muted-foreground">{statusCounts[s.value]}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search invoices…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-64 pl-9 border-border" />
            </div>
          </div>

          {invoices === undefined ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-foreground">No invoices found</p>
              <p className="mt-1 text-sm text-muted-foreground">Create your first invoice to get started.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Invoice #</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Issue Date</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Due Date</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((invoice) => (
                    <TableRow key={invoice._id} className="border-b border-border last:border-0 hover:bg-muted/50">
                      <TableCell className="font-medium text-foreground">{invoice.number}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(invoice.issueDate)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(invoice.dueDate)}</TableCell>
                      <TableCell className="font-semibold text-foreground">{formatCurrency(invoice.total)}</TableCell>
                      <TableCell><InvoiceStatusBadge status={invoice.status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-8 gap-1 text-primary hover:bg-primary/5" onClick={() => window.location.href = `/invoices/${invoice._id}`}>
                            <Eye className="h-3.5 w-3.5" /> View
                          </Button>
                          {invoice.status !== "paid" && (
                            <Button variant="ghost" size="sm" className="h-8 gap-1 text-[#22C55E] hover:bg-[#22C55E]/5" onClick={() => updateStatus({ token: localStorage.getItem("oookea_session") || "", id: invoice._id, status: "paid" })}>
                              <CheckCircle2 className="h-3.5 w-3.5" /> Paid
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Create Invoice Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Invoice</DialogTitle>
                <DialogDescription>Fill in the details to create a new invoice.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label>Client</Label>
                  <select value={newClient} onChange={(e) => setNewClient(e.target.value)} className="flex h-9 w-full rounded-lg border border-input bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="">Select client…</option>
                    {(clients ?? []).map((c) => (
                      <option key={c._id} value={c._id}>{c.name}{c.company ? ` (${c.company})` : ""}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Due Date</Label>
                    <Input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className="border-border" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Tax Rate (%)</Label>
                    <Input type="number" min="0" max="100" step="0.5" value={newTaxRate} onChange={(e) => setNewTaxRate(e.target.value)} className="border-border" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Line Items</Label>
                  <div className="space-y-2">
                    {lineItems.map((li) => (
                      <div key={li.id} className="flex items-start gap-2">
                        <div className="flex-1">
                          <Input placeholder="Description" value={li.description} onChange={(e) => setLineItems((prev) => prev.map((item) => item.id === li.id ? { ...item, description: e.target.value } : item))} className="border-border" />
                        </div>
                        <Input type="number" min="1" placeholder="Qty" value={li.quantity} onChange={(e) => setLineItems((prev) => prev.map((item) => item.id === li.id ? { ...item, quantity: parseInt(e.target.value) || 0 } : item))} className="w-20 border-border" />
                        <Input type="number" min="0" placeholder="Price" value={li.unitPrice || ""} onChange={(e) => setLineItems((prev) => prev.map((item) => item.id === li.id ? { ...item, unitPrice: parseFloat(e.target.value) || 0 } : item))} className="w-28 border-border" />
                        <Button variant="ghost" size="icon" className="mt-0.5 h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => setLineItems((prev) => prev.filter((item) => item.id !== li.id))} disabled={lineItems.length <= 1}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="mt-1 gap-1.5 border-dashed border-border text-muted-foreground" onClick={() => setLineItems((prev) => [...prev, { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0 }])}>
                    <Plus className="h-3.5 w-3.5" /> Add Line Item
                  </Button>
                </div>
                <div className="grid gap-2">
                  <Label>Notes</Label>
                  <textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Optional notes…" rows={3} className="flex w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
                <div className="rounded-lg bg-muted p-4 space-y-1.5">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="text-foreground">{formatCurrency(subtotal)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax ({newTaxRate}%)</span><span className="text-foreground">{formatCurrency(tax)}</span></div>
                  <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold"><span className="text-foreground">Total</span><span className="text-primary">{formatCurrency(total)}</span></div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button className="bg-primary hover:bg-primary/90" onClick={handleCreate} disabled={!newClient || !newDueDate || lineItems.every((li) => !li.description)}>Create Invoice</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
