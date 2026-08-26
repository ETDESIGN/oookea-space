import Link from "next/link";
import {
  FolderKanban,
  FileText,
  Upload,
  MessageSquare,
} from "lucide-react";

const actions = [
  {
    label: "View Projects",
    href: "/projects",
    icon: FolderKanban,
    color: "bg-primary/10 text-primary hover:bg-primary/20",
  },
  {
    label: "View Invoices",
    href: "/invoices",
    icon: FileText,
    color: "bg-[#22C55E]/10 text-[#22C55E] hover:bg-[#22C55E]/20",
  },
  {
    label: "Upload File",
    href: "/files",
    icon: Upload,
    color: "bg-[#8B5CF6]/10 text-[#8B5CF6] hover:bg-[#8B5CF6]/20",
  },
  {
    label: "Send Message",
    href: "/messages",
    icon: MessageSquare,
    color: "bg-[#F59E0B]/10 text-[#F59E0B] hover:bg-[#F59E0B]/20",
  },
];

export function QuickActions() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-base font-semibold text-foreground">
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={`flex items-center gap-3 rounded-lg p-3 transition-colors ${action.color}`}
          >
            <action.icon className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
