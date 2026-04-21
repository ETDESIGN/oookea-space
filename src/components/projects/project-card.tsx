import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calendar, ArrowRight } from "lucide-react";
import type { Project, ProjectStatus } from "@/types";

const statusConfig: Record<ProjectStatus, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20" },
  completed: { label: "Completed", color: "bg-[#6366F1]/10 text-[#6366F1] border-[#6366F1]/20" },
  "on-hold": { label: "On Hold", color: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20" },
  draft: { label: "Draft", color: "bg-[#94A3B8]/10 text-[#94A3B8] border-[#94A3B8]/20" },
};

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const config = statusConfig[project.status];

  return (
    <Link href={`/projects/${project.slug}`}>
      <Card className="group cursor-pointer border-[#E2E8F0] bg-white shadow-sm transition-all hover:shadow-lg hover:border-[#6366F1]/30 hover:-translate-y-0.5">
        {/* Thumbnail */}
        <div className="relative h-44 overflow-hidden rounded-t-xl bg-gradient-to-br from-[#6366F1]/20 via-[#8B5CF6]/10 to-[#EEF2FF]">
          {project.thumbnail ? (
            <img
              src={project.thumbnail}
              alt={project.title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-5xl opacity-30">🎨</span>
            </div>
          )}
          {/* Status Badge */}
          <Badge
            className={cn(
              "absolute right-3 top-3 border text-xs font-medium",
              config.color
            )}
          >
            {config.label}
          </Badge>
        </div>

        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-[#0F172A] group-hover:text-[#6366F1] transition-colors">
                {project.title}
              </h3>
              <p className="mt-0.5 text-xs text-[#64748B]">
                {project.category}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-[#94A3B8] transition-transform group-hover:translate-x-1 group-hover:text-[#6366F1]" />
          </div>

          {/* Progress */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#64748B]">Progress</span>
              <span className="font-medium text-[#0F172A]">
                {project.progress}%
              </span>
            </div>
            <Progress
              value={project.progress}
              className="h-2 bg-[#F1F5F9]"
            />
          </div>

          {/* Date */}
          <div className="mt-4 flex items-center gap-1.5 text-xs text-[#94A3B8]">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              Due{" "}
              {project.deadline
                ? new Date(project.deadline).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "TBD"}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
