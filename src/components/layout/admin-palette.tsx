"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import {
  LayoutGrid, Gauge, Users, FileText, FolderKanban, Siren, FileHeart,
  ListChecks, HardDrive, CreditCard, ExternalLink, GitBranch, Rocket,
} from "lucide-react";

// ─── R3e: Admin ⌘K palette — Fleet-aware universal launcher ───────
// Type to jump anywhere: apps (Enter = site, ⌘Enter = repo), pages,
// clients. Keyboard-first, the solo-dev leverage multiplier.

function token(): string {
  return typeof window !== "undefined" ? localStorage.getItem("oookea_session") || "" : "";
}

export function AdminPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const t = useMemo(() => token(), []);

  const apps = useQuery(api.apps.listApps, open && t ? { token: t } : "skip");
  const clients = useQuery(api.projects.listClients, open && t ? { token: t } : "skip");

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  const pages = [
    { label: "Mission Control", icon: Gauge, href: "/admin/mission-control" },
    { label: "Fleet", icon: LayoutGrid, href: "/admin/mission-control/fleet" },
    { label: "Commitments", icon: ListChecks, href: "/admin/mission-control/commitments" },
    { label: "Value Reports", icon: FileHeart, href: "/admin/reports" },
    { label: "Incidents", icon: Siren, href: "/admin/incidents" },
    { label: "Clients", icon: Users, href: "/admin/clients" },
    { label: "Invoices", icon: CreditCard, href: "/admin/invoices" },
    { label: "File Manager", icon: HardDrive, href: "/admin/uploads" },
    { label: "Admin Dashboard", icon: Rocket, href: "/admin" },
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type an app, client, or page…" />
      <CommandList>
        <CommandEmpty>Nothing matches.</CommandEmpty>

        {apps && apps.length > 0 && (
          <CommandGroup heading="Apps — Enter opens site, ⌘Enter opens repo">
            {apps.slice(0, 40).map((a) => (
              <CommandItem
                key={String(a._id)}
                value={`app ${a.name}`}
                onSelect={() => {
                  if (a.url) window.open(a.url, "_blank");
                  else run(() => router.push("/admin/mission-control/fleet"));
                }}
                onKeyUp={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && a.repoUrl) {
                    window.open(a.repoUrl, "_blank");
                    setOpen(false);
                  }
                }}
              >
                {a.url ? <ExternalLink className="mr-2 h-4 w-4" /> : a.repoUrl ? <GitBranch className="mr-2 h-4 w-4" /> : <LayoutGrid className="mr-2 h-4 w-4" />}
                {a.name}
                <span className="ml-auto text-xs text-muted-foreground">{a.category}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading="Pages">
          {pages.map((p) => (
            <CommandItem key={p.href} value={`page ${p.label}`} onSelect={() => run(() => router.push(p.href))}>
              <p.icon className="mr-2 h-4 w-4" />
              {p.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {clients && clients.length > 0 && (
          <CommandGroup heading="Clients">
            {clients.map((c) => (
              <CommandItem key={String(c._id)} value={`client ${c.name} ${c.company ?? ""}`} onSelect={() => run(() => router.push(`/admin/clients/${c._id}`))}>
                <Users className="mr-2 h-4 w-4" />
                {c.name}
                {c.company && <span className="ml-2 text-xs text-muted-foreground">{c.company}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading="Shortcuts">
          <CommandItem value="shortcut ping all apps" onSelect={() => run(() => router.push("/admin/mission-control/fleet"))}>
            <Rocket className="mr-2 h-4 w-4" /> Ping all apps (Fleet)
          </CommandItem>
          <CommandItem value="shortcut new invoice" onSelect={() => run(() => router.push("/admin/invoices"))}>
            <FileText className="mr-2 h-4 w-4" /> New invoice (Invoices)
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
