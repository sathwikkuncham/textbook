"use client";

import { useRouter } from "next/navigation";
import { Clock, Layers, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopicCardProps {
  slug: string;
  displayName: string;
  level: string;
  goal: string;
  totalModules: number;
  estimatedMinutes: number;
  completionPercent: number;
  lastSession: string;
  sourceType?: string;
  category?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  programming: "Programming",
  systems: "Systems",
  "data-science": "Data Science",
  "web-dev": "Web Dev",
  devops: "DevOps",
  theory: "Theory",
  math: "Math",
  design: "Design",
  general: "General",
};

const LEVEL_LABELS: Record<string, { label: string; class: string }> = {
  beginner: {
    label: "Beginner",
    class: "text-[var(--accent-tertiary)]",
  },
  intermediate: {
    label: "Intermediate",
    class: "text-[var(--accent-secondary)]",
  },
  advanced: {
    label: "Advanced",
    class: "text-primary",
  },
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function formatTime(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function TopicCard({
  slug,
  displayName,
  level,
  totalModules,
  estimatedMinutes,
  completionPercent,
  lastSession,
  sourceType,
  category = "general",
}: TopicCardProps) {
  const router = useRouter();
  const categoryLabel = CATEGORY_LABELS[category] ?? CATEGORY_LABELS.general;
  const levelInfo = LEVEL_LABELS[level] ?? LEVEL_LABELS.beginner;
  const isComplete = completionPercent >= 100;
  const hasProgress = completionPercent > 0 && completionPercent < 100;

  return (
    <button
      onClick={() => router.push(`/learn/${slug}`)}
      className="group relative flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-[0_1px_3px_rgba(26,22,20,0.05),0_10px_30px_-10px_rgba(26,22,20,0.08)] transition-all duration-500 hover:border-primary/30 hover:-translate-y-1 hover:shadow-[0_5px_40px_-10px_rgba(220,38,38,0.15),0_20px_50px_-15px_rgba(26,22,20,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {/* Progress indicator — thin bottom border that fills */}
      {(hasProgress || isComplete) && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted/50">
          <div
            className="h-full bg-[image:var(--gradient-primary)] transition-all duration-500"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      )}

      <div className="relative flex flex-1 flex-col p-6">
        {/* Top row: category label + level + arrow */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
              {categoryLabel}
            </span>
            {sourceType && sourceType !== "topic_only" && (
              <span className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                sourceType === "pdf"
                  ? "bg-[var(--accent-secondary)]/10 text-[var(--accent-secondary)]"
                  : "bg-[var(--accent-tertiary)]/10 text-[var(--accent-tertiary)]"
              )}>
                {sourceType.toUpperCase()}
              </span>
            )}
          </div>
          <ArrowUpRight className="size-4 text-muted-foreground/0 transition-all duration-300 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>

        {/* Title — the hero */}
        <h3 className="mb-1 font-serif text-[17px] font-semibold leading-snug tracking-tight text-card-foreground line-clamp-2">
          {displayName}
        </h3>

        {/* Level + Progress text */}
        <span className={cn("mb-1 text-[11px] font-medium", levelInfo.class)}>
          {levelInfo.label}
        </span>
        <p className="text-xs text-muted-foreground">
          {isComplete
            ? "Completed"
            : hasProgress
              ? `${Math.round(completionPercent)}% complete`
              : `${totalModules} modules · ${formatTime(estimatedMinutes)}`}
        </p>

        {/* Spacer */}
        <div className="min-h-3 flex-1" />

        {/* Bottom metadata */}
        <div className="flex items-center gap-4 border-t border-border/50 pt-3 text-[11px] text-muted-foreground/70">
          <span className="flex items-center gap-1">
            <Layers className="size-3" />
            {totalModules} modules
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {formatTime(estimatedMinutes)}
          </span>
          <span className="ml-auto">{timeAgo(lastSession)}</span>
        </div>
      </div>
    </button>
  );
}
