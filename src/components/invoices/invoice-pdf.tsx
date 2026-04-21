"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

export interface InvoicePDFProps {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: string;
  clientName: string;
  clientEmail?: string;
  clientCompany?: string;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes?: string;
}

// Register Helvetica explicitly (built-in, no external font needed)
Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica" },
    { src: "Helvetica-Bold", fontWeight: "bold" },
  ],
});

const PRIMARY = "#6366F1";
const DARK = "#0F172A";
const MEDIUM = "#64748B";
const LIGHT = "#94A3B8";
const BORDER = "#E2E8F0";
const BG = "#F8FAFC";

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: DARK,
    backgroundColor: "#FFFFFF",
  },
  // Header row
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
  },
  brandCol: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    color: "#FFFFFF",
    fontSize: 18,
    textAlign: "center",
    lineHeight: 40,
    fontFamily: "Helvetica-Bold",
  },
  brandInfo: {
    marginLeft: 12,
  },
  brandName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: DARK,
  },
  brandTagline: {
    fontSize: 9,
    color: MEDIUM,
    marginTop: 2,
  },
  brandContact: {
    fontSize: 8,
    color: LIGHT,
    marginTop: 4,
    lineHeight: 1.5,
  },
  invoiceMeta: {
    alignItems: "flex-end",
  },
  invoiceTitle: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: DARK,
  },
  metaRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  metaLabel: {
    fontSize: 9,
    color: LIGHT,
  },
  metaValue: {
    fontSize: 9,
    color: DARK,
    fontFamily: "Helvetica-Bold",
  },
  statusBadge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // Divider
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 20,
  },
  // Bill To
  billToBox: {
    backgroundColor: BG,
    border: "1 solid " + BORDER,
    borderRadius: 8,
    padding: 16,
    marginBottom: 0,
  },
  billToLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: LIGHT,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  billToName: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: DARK,
  },
  billToDetail: {
    fontSize: 9,
    color: MEDIUM,
    marginTop: 2,
  },
  // Table
  table: {
    marginTop: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: MEDIUM,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableRowLast: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tableCell: {
    fontSize: 10,
    color: DARK,
  },
  tableCellMedium: {
    fontSize: 10,
    color: MEDIUM,
  },
  tableCellBold: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: DARK,
  },
  colDesc: { flex: 3 },
  colQty: { flex: 1, textAlign: "center" },
  colPrice: { flex: 1.5, textAlign: "right" },
  colTotal: { flex: 1.5, textAlign: "right" },
  // Totals
  totalsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
  },
  totalsBox: {
    width: 200,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  totalsLabel: {
    fontSize: 10,
    color: MEDIUM,
  },
  totalsValue: {
    fontSize: 10,
    color: DARK,
    fontFamily: "Helvetica-Bold",
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: DARK,
  },
  grandTotalValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: PRIMARY,
  },
  // Notes
  notesSection: {
    marginTop: 0,
  },
  notesLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: LIGHT,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  notesText: {
    fontSize: 9,
    color: MEDIUM,
    lineHeight: 1.5,
  },
  // Footer
  footer: {
    marginTop: 0,
    alignItems: "center",
  },
  footerText: {
    fontSize: 10,
    color: LIGHT,
  },
  footerEmail: {
    fontSize: 8,
    color: LIGHT,
    marginTop: 4,
  },
});

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

function getStatusStyle(status: string) {
  switch (status) {
    case "paid":
      return { backgroundColor: "#DCFCE7", color: "#16A34A" };
    case "overdue":
      return { backgroundColor: "#FEE2E2", color: "#DC2626" };
    case "sent":
      return { backgroundColor: "#DBEAFE", color: "#2563EB" };
    case "cancelled":
      return { backgroundColor: "#F1F5F9", color: "#64748B" };
    default:
      return { backgroundColor: "#F1F5F9", color: "#64748B" };
  }
}

export function InvoicePDFDocument(props: InvoicePDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.brandCol}>
            <View style={styles.brandIcon}>
              <Text>O</Text>
            </View>
            <View style={styles.brandInfo}>
              <Text style={styles.brandName}>Oookea</Text>
              <Text style={styles.brandTagline}>Digital Atelier</Text>
              <Text style={styles.brandContact}>
                hello@oookea.com{"\n"}
                123 Innovation Drive, Suite 400{"\n"}
                San Francisco, CA 94107
              </Text>
            </View>
          </View>
          <View style={styles.invoiceMeta}>
            <Text style={styles.invoiceTitle}>Invoice</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Invoice:</Text>
              <Text style={styles.metaValue}>{props.invoiceNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Issued:</Text>
              <Text style={styles.metaValue}>{formatDate(props.issueDate)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Due:</Text>
              <Text style={styles.metaValue}>{formatDate(props.dueDate)}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                getStatusStyle(props.status),
              ]}
            >
              <Text>{props.status.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Bill To */}
        <View style={styles.billToBox}>
          <Text style={styles.billToLabel}>Bill To</Text>
          <Text style={styles.billToName}>
            {props.clientCompany || props.clientName}
          </Text>
          {props.clientCompany && (
            <Text style={styles.billToDetail}>{props.clientName}</Text>
          )}
          {props.clientEmail && (
            <Text style={styles.billToDetail}>{props.clientEmail}</Text>
          )}
        </View>

        <View style={styles.divider} />

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colDesc]}>
              Description
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, styles.colPrice]}>
              Unit Price
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colTotal]}>Total</Text>
          </View>
          {props.items.map((item, idx) => (
            <View
              key={idx}
              style={
                idx === props.items.length - 1
                  ? styles.tableRowLast
                  : styles.tableRow
              }
            >
              <Text style={[styles.tableCellBold, styles.colDesc]}>
                {item.description}
              </Text>
              <Text style={[styles.tableCellMedium, styles.colQty]}>
                {item.quantity}
              </Text>
              <Text style={[styles.tableCellMedium, styles.colPrice]}>
                {formatCurrency(item.unitPrice)}
              </Text>
              <Text style={[styles.tableCellBold, styles.colTotal]}>
                {formatCurrency(item.total)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>
                {formatCurrency(props.subtotal)}
              </Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>
                Tax ({props.taxRate}%)
              </Text>
              <Text style={styles.totalsValue}>
                {formatCurrency(props.taxAmount)}
              </Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Grand Total</Text>
              <Text style={styles.grandTotalValue}>
                {formatCurrency(props.total)}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {props.notes && (
          <View>
            <View style={styles.divider} />
            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>Notes</Text>
              <Text style={styles.notesText}>{props.notes}</Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.divider} />
        <View style={styles.footer}>
          <Text style={styles.footerText}>Thank you for your business!</Text>
          <Text style={styles.footerEmail}>hello@oookea.com</Text>
        </View>
      </Page>
    </Document>
  );
}
