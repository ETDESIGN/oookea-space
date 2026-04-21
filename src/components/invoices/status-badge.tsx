import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/types";

const config: Record<InvoiceStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-[#94A3B8]/10 text-[#94A3B8] border-[#94A3B8]/20" },
  sent: { label: "Sent", className: "bg-[#6366F1]/10 text-[#6366F1] border-[#6366F1]/20" },
  paid: { label: "Paid", className: "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20" },
  overdue: { label: "Overdue", className: "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20" },
  cancelled: { label: "Cancelled", className: "bg-[#64748B]/10 text-[#64748B] border-[#64748B]/20" },
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const c = config[status];
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", c.className)}>
      {c.label}
    </span>
  );
}
