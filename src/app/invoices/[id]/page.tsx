"use client";

import { ProtectedRoute } from "@/lib/auth";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { InvoiceStatusBadge } from "@/components/invoices/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Download,
  Printer,
  Mail,
  Building2,
  Calendar,
  Hash,
} from "lucide-react";
import type { Invoice } from "@/types";

const mockInvoice: Invoice = {
  id: "2",
  number: "INV-2026-002",
  status: "sent",
  issueDate: "2026-03-01",
  dueDate: "2026-04-01",
  client: "Acme Corp",
  items: [
    {
      id: "i3",
      description: "Brand Identity Package",
      quantity: 1,
      unitPrice: 3500,
      total: 3500,
    },
    {
      id: "i4",
      description: "Social Media Kit",
      quantity: 1,
      unitPrice: 1200,
      total: 1200,
    },
    {
      id: "i5",
      description: "Brand Guidelines PDF",
      quantity: 1,
      unitPrice: 800,
      total: 800,
    },
    {
      id: "i6",
      description: "Revision Rounds (2×)",
      quantity: 2,
      unitPrice: 500,
      total: 1000,
    },
  ],
  subtotal: 6500,
  tax: 650,
  total: 7150,
  notes:
    "Payment is due within 30 days of the issue date. Please include the invoice number in your payment reference. Thank you for choosing Oookea!",
  projectSlug: "brand-identity",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = useAuth();

  // In production, fetch invoice by ID from API using params.id
  const invoice = mockInvoice;

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          {/* Breadcrumb & Actions */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <a
                href="/invoices"
                className="inline-flex items-center gap-1.5 text-sm text-[#64748B] hover:text-[#0F172A] transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Invoices
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button
                size="sm"
                className="gap-1.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white"
                onClick={() => {
                  /* PDF download placeholder */
                }}
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </div>

          {/* Invoice Paper */}
          <Card className="overflow-hidden border-[#E2E8F0] shadow-sm">
            <CardContent className="p-0">
              <div className="p-6 sm:p-10">
                {/* Header: Branding + Status */}
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#6366F1] text-white font-bold text-lg">
                      O
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[#0F172A]">Oookea</h2>
                      <div className="mt-1 space-y-0.5 text-sm text-[#64748B]">
                        <p>hello@oookea.com</p>
                        <p>123 Innovation Drive, Suite 400</p>
                        <p>San Francisco, CA 94107</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <h1 className="text-2xl font-bold text-[#0F172A]">Invoice</h1>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2 text-sm sm:justify-end">
                        <Hash className="h-3.5 w-3.5 text-[#94A3B8]" />
                        <span className="text-[#64748B]">Invoice:</span>
                        <span className="font-semibold text-[#0F172A]">{invoice.number}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm sm:justify-end">
                        <Calendar className="h-3.5 w-3.5 text-[#94A3B8]" />
                        <span className="text-[#64748B]">Issued:</span>
                        <span className="font-medium text-[#0F172A]">
                          {formatDate(invoice.issueDate)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm sm:justify-end">
                        <Calendar className="h-3.5 w-3.5 text-[#94A3B8]" />
                        <span className="text-[#64748B]">Due:</span>
                        <span className="font-medium text-[#0F172A]">
                          {formatDate(invoice.dueDate)}
                        </span>
                      </div>
                      <div className="pt-1">
                        <InvoiceStatusBadge status={invoice.status} />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="my-8 bg-[#E2E8F0]" />

                {/* Bill To */}
                <div className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] mb-2">
                    Bill To
                  </p>
                  <div className="flex items-start gap-3">
                    <Building2 className="mt-0.5 h-5 w-5 text-[#6366F1]" />
                    <div>
                      <p className="font-semibold text-[#0F172A]">{invoice.client}</p>
                      <p className="mt-0.5 text-sm text-[#64748B]">
                        {user?.email || "contact@acmecorp.com"}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator className="my-8 bg-[#E2E8F0]" />

                {/* Line Items */}
                <div className="rounded-lg border border-[#E2E8F0] overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#F8FAFC] hover:bg-transparent">
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                          Description
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-[#64748B] text-center">
                          Qty
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-[#64748B] text-right">
                          Unit Price
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-[#64748B] text-right">
                          Total
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoice.items.map((item, idx) => (
                        <TableRow
                          key={item.id}
                          className="border-b border-[#E2E8F0] last:border-0 hover:bg-[#F8FAFC]"
                        >
                          <TableCell className="font-medium text-[#0F172A]">
                            {item.description}
                          </TableCell>
                          <TableCell className="text-center text-[#64748B]">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-right text-[#64748B]">
                            {formatCurrency(item.unitPrice)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-[#0F172A]">
                            {formatCurrency(item.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Totals */}
                <div className="mt-6 flex justify-end">
                  <div className="w-full max-w-xs space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#64748B]">Subtotal</span>
                      <span className="font-medium text-[#0F172A]">
                        {formatCurrency(invoice.subtotal)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#64748B]">Tax (10%)</span>
                      <span className="font-medium text-[#0F172A]">
                        {formatCurrency(invoice.tax)}
                      </span>
                    </div>
                    <Separator className="bg-[#E2E8F0]" />
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-[#0F172A]">Grand Total</span>
                      <span className="text-xl font-bold text-[#6366F1]">
                        {formatCurrency(invoice.total)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {invoice.notes && (
                  <>
                    <Separator className="my-8 bg-[#E2E8F0]" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] mb-2">
                        Notes
                      </p>
                      <p className="text-sm leading-relaxed text-[#64748B]">
                        {invoice.notes}
                      </p>
                    </div>
                  </>
                )}

                {/* Footer */}
                <Separator className="my-8 bg-[#E2E8F0]" />
                <div className="text-center">
                  <p className="text-sm text-[#94A3B8]">
                    Thank you for your business!
                  </p>
                  <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-[#94A3B8]">
                    <Mail className="h-3 w-3" />
                    <span>hello@oookea.com</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
