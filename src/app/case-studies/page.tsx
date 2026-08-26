"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/lib/auth";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { EmptyState } from "@/components/studio/illustrations";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

/**
 * Case Studies — editorial archive of completed work.
 * Clients see their own studio's published case studies.
 */

type CaseStudy = {
  _id: string;
  title: string;
  summary?: string;
  story?: string;
  coverUrl?: string;
  year: number;
  tags?: string[];
};

export default function CaseStudiesPage() {
  const { user } = useAuth();
  const sessionToken =
    typeof window !== "undefined" ? localStorage.getItem("oookea_session") || "" : "";
  const studies = useQuery(
    api.projects.caseStudies,
    sessionToken ? { token: sessionToken } : "skip"
  ) as CaseStudy[] | undefined;

  const [openStudy, setOpenStudy] = useState<CaseStudy | null>(null);

  const byYear = (studies ?? []).reduce<Record<number, CaseStudy[]>>((acc, cs) => {
    (acc[cs.year] ||= []).push(cs);
    return acc;
  }, {});
  const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a));

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-8">
          {/* Editorial header */}
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
              Case Studies
            </h1>
            <p className="mt-1.5 text-muted-foreground">
              Completed work, documented — the story of what we built together.
            </p>
          </div>

          {studies === undefined ? (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="h-64 animate-pulse rounded-2xl bg-muted" />
              <div className="h-64 animate-pulse rounded-2xl bg-muted" />
            </div>
          ) : studies.length === 0 ? (
            <EmptyState
              variant="projects"
              title="No case studies yet"
              body="When a project is completed, the studio can publish it here — a documented story of the work."
            />
          ) : (
            years.map((year) => (
              <section key={year} className="space-y-5">
                <div className="flex items-center gap-4">
                  <span className="font-display text-2xl font-bold text-foreground">{year}</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  {byYear[Number(year)].map((cs, i) => (
                    <motion.button
                      key={cs._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      onClick={() => setOpenStudy(cs)}
                      className="group overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
                    >
                      {/* Cover */}
                      <div className="relative h-52 overflow-hidden bg-gradient-to-br from-primary/25 via-secondary/15 to-accent">
                        {cs.coverUrl ? (
                          <img
                            src={cs.coverUrl}
                            alt={cs.title}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <span className="font-display text-5xl font-black text-white/15">O</span>
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <h3 className="font-display text-lg font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors">
                          {cs.title}
                        </h3>
                        {cs.summary && (
                          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                            {cs.summary}
                          </p>
                        )}
                        {cs.tags && cs.tags.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {cs.tags.slice(0, 3).map((t) => (
                              <Badge key={t} variant="outline" className="text-[10px] font-medium text-muted-foreground">
                                {t}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

        {/* Reader dialog */}
        <Dialog open={!!openStudy} onOpenChange={(o) => !o && setOpenStudy(null)}>
          <DialogContent className="max-w-2xl border-border bg-card">
            {openStudy && (
              <>
                <DialogHeader>
                  <DialogTitle className="font-display text-xl font-bold tracking-tight">
                    {openStudy.title}
                  </DialogTitle>
                </DialogHeader>
                {openStudy.coverUrl && (
                  <img
                    src={openStudy.coverUrl}
                    alt=""
                    className="aspect-video w-full rounded-xl object-cover"
                  />
                )}
                {openStudy.summary && (
                  <p className="text-sm font-medium leading-relaxed text-foreground">
                    {openStudy.summary}
                  </p>
                )}
                {openStudy.story && (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {openStudy.story}
                  </p>
                )}
                <p className="text-xs text-muted-foreground/60">
                  Delivered by Oookea — Digital Atelier · {openStudy.year}
                </p>
              </>
            )}
          </DialogContent>
        </Dialog>
      </AppLayout>
    </ProtectedRoute>
  );
}
