"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  X,
  ExternalLink,
  GitBranch,
  Globe,
  Gauge,
  BookOpen,
  MessageSquare,
  FlaskConical,
  Radar,
  CircleCheck,
  TriangleAlert,
  CalendarDays,
  User,
  Layers,
  Link2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  STATUS_DOT,
  STATUS_LABEL,
  BAR_COLORS,
  buildBars,
  uptimePctOf,
  timeAgo,
  type AppDoc,
  type DerivedStatus,
  type DailyCheck,
} from "./shared";

// ─── Fleet drawer — the right-side info tab ────────────────────────
// macOS Quick Look / Linear-peek pattern: click a card, slide in from
// the right with live health, structured links and documentation.
// Escape / overlay click / ✕ closes; focus moves to the close button.

const LINK_ICONS: Record<string, typeof Globe> = {
  app: ExternalLink,
  repo: GitBranch,
  staging: FlaskConical,
  dashboard: Gauge,
  docs: BookOpen,
  chat: MessageSquare,
  web: Globe,
};

export function FleetDrawer({
  app,
  status,
  checks,
  onClose,
}: {
  app: AppDoc | null;
  status: DerivedStatus;
  checks: DailyCheck[];
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!app) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [app, onClose]);

  const bars = useMemo(() => (app ? buildBars(checks) : []), [app, checks]);
  const up = useMemo(() => (app ? uptimePctOf(checks) : null), [app, checks]);

  if (!app) return null;

  const info = app.info as
    | {
        purpose?: string;
        stack?: string[];
        domains?: string[];
        launched?: string;
        owner?: string;
        notes?: string;
        blocks?: { title: string; body: string }[];
      }
    | undefined;
  const links = (app.links ?? []) as { label: string; url: string; kind?: string }[];

  const uptimeText =
    up !== null ? `${up.toFixed(up >= 99 ? 1 : 2)}%` : app.lastPingAt ? "first day" : "no checks yet";

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${app.name} details`}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md translate-x-0 flex-col border-l bg-background shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b p-4">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-background ${
                app.brandIcon || app.iconUrl ? "p-1.5" : ""
              }`}
            >
              {app.brandIcon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`https://cdn.simpleicons.org/${app.brandIcon}/6366F1`}
                  alt=""
                  className="h-full w-full object-contain"
                />
              ) : app.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={app.iconUrl} alt="" className="h-full w-full object-contain" />
              ) : (
                <Layers className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-foreground">{app.name}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="border-0 bg-muted text-[11px] capitalize">
                  {app.category}
                </Badge>
                <Badge
                  variant="secondary"
                  className={`gap-1.5 border-0 bg-muted text-[11px] text-foreground`}
                >
                  <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
                  {STATUS_LABEL[status]}
                </Badge>
              </div>
            </div>
          </div>
          <button
            ref={closeRef}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={onClose}
            aria-label="Close details"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          {/* Live health */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Live health
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border p-2.5">
                <p className="text-[10px] uppercase text-muted-foreground">Probe</p>
                <p className={`text-sm font-semibold ${app.lastOk ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                  {app.lastPingAt === undefined
                    ? "—"
                    : app.lastOk
                      ? `${app.lastMs} ms`
                      : app.lastStatusCode === 0
                        ? "timeout"
                        : `HTTP ${app.lastStatusCode}`}
                </p>
                <p className="text-[10px] text-muted-foreground/60">
                  {app.lastPingAt ? timeAgo(app.lastPingAt) : "not probed yet"}
                </p>
              </div>
              <div className="rounded-lg border p-2.5">
                <p className="text-[10px] uppercase text-muted-foreground">Uptime 30d</p>
                <p className="text-sm font-semibold text-foreground">{uptimeText}</p>
                <p className="text-[10px] text-muted-foreground/60">HTTP probes</p>
              </div>
              <div className="rounded-lg border p-2.5">
                <p className="text-[10px] uppercase text-muted-foreground">Sources</p>
                <p className="flex flex-wrap gap-x-2 text-[11px] text-muted-foreground">
                  {app.vercelProject && (
                    <span className="flex items-center gap-0.5">
                      <TriangleAlert className="h-3 w-3" /> vercel
                    </span>
                  )}
                  {app.heartbeatName && (
                    <span className="flex items-center gap-0.5">
                      <CircleCheck className="h-3 w-3" /> hb
                    </span>
                  )}
                  {!app.vercelProject && !app.heartbeatName && <span>probe/override</span>}
                </p>
              </div>
            </div>
            <div className="mt-2 flex h-4 items-end gap-[2px]" aria-hidden="true">
              {bars.map((b, i) => (
                <span
                  key={i}
                  title={b.tip}
                  className={`h-full flex-1 rounded-[1px] ${b.color} opacity-80 hover:opacity-100`}
                />
              ))}
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground/50">Last 30 days of probes</p>
          </section>

          {/* Primary actions */}
          {(app.url || app.repoUrl) && (
            <div className="flex flex-wrap gap-2">
              {app.url && (
                <a
                  href={app.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Open app
                </a>
              )}
              {app.repoUrl && (
                <a
                  href={app.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <GitBranch className="h-3.5 w-3.5" /> Repository
                </a>
              )}
            </div>
          )}

          {/* About */}
          {(info?.purpose || app.description) && (
            <section>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                About
              </h3>
              <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
                {info?.purpose ?? app.description}
              </p>
              {info?.notes && (
                <p className="mt-2 rounded-lg border border-dashed p-2.5 text-xs text-muted-foreground">
                  {info.notes}
                </p>
              )}
            </section>
          )}

          {/* Links */}
          {links.length > 0 && (
            <section>
              <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Link2 className="h-3.5 w-3.5" /> Links
              </h3>
              <ul className="space-y-1.5">
                {links.map((l) => {
                  const Icon = LINK_ICONS[l.kind ?? ""] ?? Globe;
                  return (
                    <li key={l.url + l.label}>
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-muted/40"
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="flex-1 truncate">{l.label}</span>
                        <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Domains */}
          {info?.domains && info.domains.length > 0 && (
            <section>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Domains
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {info.domains.map((d) => (
                  <code key={d} className="rounded bg-muted px-2 py-0.5 text-xs text-foreground">
                    {d}
                  </code>
                ))}
              </div>
            </section>
          )}

          {/* Stack */}
          {info?.stack && info.stack.length > 0 && (
            <section>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Stack
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {info.stack.map((s) => (
                  <Badge key={s} variant="secondary" className="border-0 bg-muted text-[11px] font-normal">
                    {s}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {/* Documentation blocks */}
          {info?.blocks && info.blocks.length > 0 && (
            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <BookOpen className="h-3.5 w-3.5" /> Documentation
              </h3>
              <div className="space-y-3">
                {info.blocks.map((b) => (
                  <div key={b.title} className="rounded-lg border p-3">
                    <p className="text-xs font-semibold text-foreground">{b.title}</p>
                    <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                      {b.body}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Meta */}
          {(info?.launched || info?.owner) && (
            <section className="flex flex-wrap gap-x-5 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
              {info.launched && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" /> since {info.launched}
                </span>
              )}
              {info.owner && (
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> {info.owner}
                </span>
              )}
            </section>
          )}
        </div>
      </aside>
    </>
  );
}
