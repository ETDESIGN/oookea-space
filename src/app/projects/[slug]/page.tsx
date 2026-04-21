"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  ExternalLink,
  Download,
  Calendar,
  CheckCircle2,
  Circle,
  Send,
  Paperclip,
  Clock,
  Globe,
} from "lucide-react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useParams } from "next/navigation";

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-[#22C55E]/10 text-[#22C55E]" },
  completed: { label: "Completed", color: "bg-primary/10 text-primary" },
  "on-hold": { label: "On Hold", color: "bg-[#F59E0B]/10 text-[#F59E0B]" },
  draft: { label: "Draft", color: "bg-[#94A3B8]/10 text-muted-foreground" },
};

export default function ProjectDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [newComment, setNewComment] = useState("");

  const project = useQuery(api.projects.getProject, { slug });
  const deliverables = useQuery(
    api.projects.listDeliverables,
    project ? { projectId: project._id } : "skip"
  );
  const activity = useQuery(
    api.projects.listActivity,
    project ? { projectId: project._id, limit: 10 } : "skip"
  );

  const toggleDeliverable = useMutation(api.projects.toggleDeliverable);

  if (project === undefined) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  if (project === null) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg font-medium text-foreground">Project not found</p>
            <Link href="/projects" className="mt-2 text-sm text-primary hover:underline">
              Back to Projects
            </Link>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  const config = statusConfig[project.status] ?? statusConfig.draft;
  const completedCount = deliverables?.filter((d) => d.completed).length ?? 0;
  const totalCount = deliverables?.length ?? 0;

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <Link href="/projects" className="flex items-center gap-1 text-primary hover:text-primary">
              <ArrowLeft className="h-4 w-4" />
              Projects
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">{project.title}</span>
          </div>

          {/* Hero Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#6366F1] via-[#8B5CF6] to-[#A78BFA] p-8 text-white">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ij48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnYtMmgtNHY2aDR2LTR6bS0xMiAwSDIydi00aDJ2LTJoLTR2Nmgydi00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <Badge className={`${config.color} border-0 text-sm`}>{config.label}</Badge>
                <Badge variant="outline" className="border-white/30 text-white">{project.category}</Badge>
              </div>
              <h1 className="text-3xl font-bold">{project.title}</h1>
              <p className="mt-2 text-white/80 max-w-2xl">{project.description}</p>
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column */}
            <div className="space-y-6 lg:col-span-2">
              {/* Project Brief */}
              {project.brief && (
                <Card className="border-border">
                  <CardContent className="p-6">
                    <h3 className="mb-3 text-base font-semibold text-foreground">Project Brief</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{project.brief}</p>
                  </CardContent>
                </Card>
              )}

              {/* Deliverables */}
              <Card className="border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-foreground">Deliverables</h3>
                    <span className="text-sm text-muted-foreground">{completedCount}/{totalCount} complete</span>
                  </div>
                  {deliverables === undefined ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
                    </div>
                  ) : deliverables.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No deliverables yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {deliverables.map((d) => (
                        <button
                          key={d._id}
                          onClick={() => toggleDeliverable({ id: d._id, completed: !d.completed })}
                          className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-background"
                        >
                          {d.completed ? (
                            <CheckCircle2 className="h-5 w-5 text-[#22C55E] shrink-0" />
                          ) : (
                            <Circle className="h-5 w-5 text-[#CBD5E1] shrink-0" />
                          )}
                          <span className={`text-sm ${d.completed ? "text-foreground" : "text-muted-foreground"}`}>
                            {d.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Activity Thread */}
              <Card className="border-border">
                <CardContent className="p-6">
                  <h3 className="mb-4 text-base font-semibold text-foreground">Activity</h3>
                  {activity === undefined ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
                    </div>
                  ) : activity.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No activity yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {activity.map((item) => (
                        <div key={item._id} className="flex gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {item.type === "upload" ? "📤" :
                             item.type === "milestone" ? "🎯" :
                             item.type === "comment" ? "💬" : "🔄"}
                          </div>
                          <div>
                            <p className="text-sm text-foreground">
                              {item.message}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* New Comment */}
                  <Separator className="my-4 bg-[#E2E8F0]" />
                  <div className="flex gap-3">
                    <Input
                      placeholder="Post an update…"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="border-border"
                    />
                    <Button size="icon" className="shrink-0 bg-primary hover:bg-primary/90">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* Status Card */}
              <Card className="border-border">
                <CardContent className="p-6 space-y-5">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Progress</p>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold text-foreground">{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} className="mt-3 h-2.5 bg-muted" />
                  </div>

                  <Separator className="bg-[#E2E8F0]" />

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Started</span>
                      <span className="ml-auto font-medium text-foreground">
                        {new Date(project.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                    {project.deadline && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Deadline</span>
                        <span className="ml-auto font-medium text-foreground">
                          {new Date(project.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                    )}
                    {project.websiteUrl && (
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Live site</span>
                        <a href={project.websiteUrl} target="_blank" rel="noopener noreferrer" className="ml-auto font-medium text-primary">
                          {project.websiteUrl.replace(/^https?:\/\//, "")}
                        </a>
                      </div>
                    )}
                  </div>

                  {(project.websiteUrl || project.thumbnail) && (
                    <>
                      <Separator className="bg-[#E2E8F0]" />
                      <div className="flex flex-col gap-2">
                        {project.websiteUrl && (
                          <a href={project.websiteUrl} target="_blank" rel="noopener noreferrer">
                            <Button className="w-full bg-primary hover:bg-primary/90">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Visit Website
                            </Button>
                          </a>
                        )}
                        {project.thumbnail && (
                          <a href={project.thumbnail} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" className="w-full border-border">
                              <Download className="mr-2 h-4 w-4" />
                              Download Files
                            </Button>
                          </a>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Tags */}
              {project.tags && project.tags.length > 0 && (
                <Card className="border-border">
                  <CardContent className="p-6">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {project.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="border-border text-muted-foreground">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
