import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  color: string;
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  color,
}: StatCardProps) {
  return (
    <Card className="border-border bg-card shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight text-foreground">
              {value}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {trend && (
              <p
                className={cn(
                  "text-xs font-medium",
                  trend.positive ? "text-[#22C55E]" : "text-destructive"
                )}
              >
                {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}%{" "}
                <span className="text-muted-foreground">vs last month</span>
              </p>
            )}
          </div>
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl",
              color
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
