"use client";

import { use, useState, useCallback } from "react";
import { ProtectedRoute } from "@/lib/auth";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { InvoiceStatusBadge } from "@/components/invoices/status-badge";
import { InvoicePDFDocument } from "@/components/invoices/invoice-pdf";
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
  Loader2,
} from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

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
  const { id } = use(params);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const invoice = useQuery(
    api.projects.getInvoice,
    id ? { id: id as Id<"invoices"> } : "skip"
  );

  // Fetch client info for the invoice
  const client = useQuery(
    api.projects.getUserById,
    invoice ? { id: invoice.clientId } : "skip"
  );

  const handleDownloadPDF = useCallback(async () => {
    if (!invoice) return;
    setGeneratingPDF(true);
    try {
      const doc = (
        <InvoicePDFDocument
          invoiceNumber={invoice.number}
          issueDate={invoice.issueDate}
          dueDate={invoice.dueDate}
          status={invoice.status}
          clientName={client?.name || user?.name || "Client"}
          clientEmail={client?.email || user?.email || ""}
          clientCompany={client?.company || user?.company}
          items={invoice.items}
          subtotal={invoice.subtotal}
          taxRate={invoice.taxRate}
          taxAmount={invoice.taxAmount}
          total={invoice.total}
          notes={invoice.notes}
        />
      );
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${invoice.number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
    } finally {
      setGeneratingPDF(false);
    }
  }, [invoice, client, user]);

  if (invoice === undefined) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  if (invoice === null) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-lg font-medium text-foreground">Invoice not found</p>
            <a href="/invoices" className="mt-2 text-sm text-primary hover:underline">
              Back to Invoices
            </a>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          {/* Breadcrumb & Actions */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <a
                href="/invoices"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Invoices
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button
                size="sm"
                className="gap-1.5 bg-primary hover:bg-primary/90 text-white"
                onClick={handleDownloadPDF}
                disabled={generatingPDF || !invoice}
              >
                {generatingPDF ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {generatingPDF ? "Generating…" : "Download PDF"}
              </Button>
            </div>
          </div>

          {/* Invoice Paper */}
          <Card className="overflow-hidden border-border shadow-sm">
            <CardContent className="p-0">
              <div className="p-6 sm:p-10">
                {/* Header: Branding + Status */}
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-white font-bold text-lg">
                      O
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">Oookea</h2>
                      <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                        <p>hello@oookea.com</p>
                        <p>123 Innovation Drive, Suite 400</p>
                        <p>San Francisco, CA 94107</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <h1 className="text-2xl font-bold text-foreground">Invoice</h1>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2 text-sm sm:justify-end">
                        <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Invoice:</span>
                        <span className="font-semibold text-foreground">{invoice.number}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm sm:justify-end">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Issued:</span>
                        <span className="font-medium text-foreground">
                          {formatDate(invoice.issueDate)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm sm:justify-end">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Due:</span>
                        <span className="font-medium text-foreground">
                          {formatDate(invoice.dueDate)}
                        </span>
                      </div>
                      <div className="pt-1">
                        <InvoiceStatusBadge status={invoice.status} />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="my-8 bg-border" />

                {/* Bill To */}
                <div className="rounded-lg bg-background border border-border p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Bill To
                  </p>
                  <div className="flex items-start gap-3">
                    <Building2 className="mt-0.5 h-5 w-5 text-primary" />
                    <div>
                      <p className="font-semibold text-foreground">{user?.company || user?.name || "Client"}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {user?.email || ""}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator className="my-8 bg-border" />

                {/* Line Items */}
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-background hover:bg-transparent">
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Description
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
                          Qty
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                          Unit Price
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                          Total
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoice.items.map((item, idx) => (
                        <TableRow
                          key={idx}
                          className="border-b border-border last:border-0 hover:bg-background"
                        >
                          <TableCell className="font-medium text-foreground">
                            {item.description}
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatCurrency(item.unitPrice)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-foreground">
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
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(invoice.subtotal)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Tax ({invoice.taxRate}%)</span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(invoice.taxAmount)}
                      </span>
                    </div>
                    <Separator className="bg-border" />
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-foreground">Grand Total</span>
                      <span className="text-xl font-bold text-primary">
                        {formatCurrency(invoice.total)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {invoice.notes && (
                  <>
                    <Separator className="my-8 bg-border" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Notes
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {invoice.notes}
                      </p>
                    </div>
                  </>
                )}

                {/* Footer */}
                <Separator className="my-8 bg-border" />
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Thank you for your business!
                  </p>
                  <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
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
