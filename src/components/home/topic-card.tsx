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

const CATEGORY_ACCENTS: Record<string, string> = {
  programming: "from-blue-500/10 to-blue-500/0 dark:from-blue-400/10",
  systems: "from-orange-500/10 to-orange-500/0 dark:from-orange-400/10",
  "data-science": "from-cyan-500/10 to-cyan-500/0 dark:from-cyan-400/10",
  "web-dev": "from-violet-500/10 to-violet-500/0 dark:from-violet-400/10",
  devops: "from-amber-500/10 to-amber-500/0 dark:from-amber-400/10",
  theory: "from-rose-500/10 to-rose-500/0 dark:from-rose-400/10",
  math: "from-emerald-500/10 to-emerald-500/0 dark:from-emerald-400/10",
  design: "from-pink-500/10 to-pink-500/0 dark:from-pink-400/10",
  general: "from-primary/10 to-primary/0",
};

const LEVEL_LABELS: Record<string, { label: string; class: string }> = {
  beginner: {
    label: "Beginner",
    class: "text-primary/70",
  },
  intermediate: {
    label: "Intermediate",
    class: "text-primary/85",
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
  const accent = CATEGORY_ACCENTS[category] ?? CATEGORY_ACCENTS.general;
  const levelInfo = LEVEL_LABELS[level] ?? LEVEL_LABELS.beginner;
  const isComplete = completionPercent >= 100;
  const hasProgress = completionPercent > 0 && completionPercent < 100;

  return (
    <button
      onClick={() => router.push(`/learn/${slug}`)}
      className="group relative flex w-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card text-left transition-all duration-300 hover:border-border hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {/* Subtle gradient wash based on category */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          accent
        )}
      />

      {/* Progress indicator — thin bottom border that fills */}
      {(hasProgress || isComplete) && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted/50">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      )}

      <div className="relative flex flex-1 flex-col p-5">
        {/* Top row: category tag + arrow */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {sourceType && sourceType !== "topic_only" && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {sourceType.toUpperCase()}
              </span>
            )}
            <span className={cn("text-[11px] font-medium", levelInfo.class)}>
              {levelInfo.label}
            </span>
          </div>
          <ArrowUpRight className="size-4 text-muted-foreground/0 transition-all duration-300 group-hover:text-muted-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>

        {/* Title — the hero */}
        <h3 className="mb-1 font-serif text-[17px] font-semibold leading-snug tracking-tight text-card-foreground line-clamp-2">
          {displayName}
        </h3>

        {/* Progress text */}
        <p className="mb-4 text-xs text-muted-foreground">
          {isComplete
            ? "Completed"
            : hasProgress
              ? `${Math.round(completionPercent)}% complete`
              : `${totalModules} modules · ${formatTime(estimatedMinutes)}`}
        </p>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom metadata */}
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground/70">
          {!isComplete && hasProgress && (
            <>
              <span className="flex items-center gap-1">
                <Layers className="size-3" />
                {totalModules}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {formatTime(estimatedMinutes)}
              </span>
            </>
          )}
          <span className="ml-auto">{timeAgo(lastSession)}</span>
        </div>
      </div>
    </button>
  );
}
