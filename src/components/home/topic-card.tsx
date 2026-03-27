"use client";

import { useRouter } from "next/navigation";
import { Clock, Layers } from "lucide-react";
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

const CATEGORY_COLORS: Record<string, { strip: string; ring: string }> = {
  programming: { strip: "bg-blue-500", ring: "text-blue-500" },
  systems: { strip: "bg-orange-500", ring: "text-orange-500" },
  "data-science": { strip: "bg-cyan-500", ring: "text-cyan-500" },
  "web-dev": { strip: "bg-violet-500", ring: "text-violet-500" },
  devops: { strip: "bg-amber-500", ring: "text-amber-500" },
  theory: { strip: "bg-rose-500", ring: "text-rose-500" },
  math: { strip: "bg-emerald-500", ring: "text-emerald-500" },
  design: { strip: "bg-pink-500", ring: "text-pink-500" },
  general: { strip: "bg-primary", ring: "text-primary" },
};

const LEVEL_DOTS: Record<string, string> = {
  beginner: "bg-emerald-400",
  intermediate: "bg-blue-400",
  advanced: "bg-purple-400",
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

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** SVG progress ring — small, clean, color-coded by category */
function ProgressRing({
  percent,
  colorClass,
}: {
  percent: number;
  colorClass: string;
}) {
  const r = 18;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative flex size-12 shrink-0 items-center justify-center">
      <svg className="size-12 -rotate-90" viewBox="0 0 44 44">
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-muted/50"
        />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn("transition-all duration-500", colorClass)}
        />
      </svg>
      <span className="absolute text-[11px] font-semibold tabular-nums text-foreground">
        {Math.round(percent)}%
      </span>
    </div>
  );
}

export function TopicCard({
  slug,
  displayName,
  level,
  goal,
  totalModules,
  estimatedMinutes,
  completionPercent,
  lastSession,
  sourceType,
  category = "general",
}: TopicCardProps) {
  const router = useRouter();
  const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.general;

  return (
    <button
      onClick={() => router.push(`/learn/${slug}`)}
      className="group flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {/* Category color strip */}
      <div className={cn("h-1 w-full", colors.strip)} />

      <div className="flex flex-1 flex-col p-4">
        {/* Title + progress ring row */}
        <div className="mb-3 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-base font-semibold leading-snug text-card-foreground transition-colors line-clamp-2 group-hover:text-primary">
              {displayName}
            </h3>
            <div className="mt-1.5 flex items-center gap-2">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  LEVEL_DOTS[level] ?? "bg-muted-foreground"
                )}
              />
              <span className="text-[11px] text-muted-foreground">
                {level}
              </span>
              {sourceType && sourceType !== "topic_only" && (
                <>
                  <span className="text-[11px] text-muted-foreground/40">
                    &middot;
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {sourceType.toUpperCase()}
                  </span>
                </>
              )}
            </div>
          </div>
          <ProgressRing percent={completionPercent} colorClass={colors.ring} />
        </div>

        {/* Metadata row */}
        <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-3 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Layers className="size-3" />
              {totalModules}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {formatMinutes(estimatedMinutes)}
            </span>
          </div>
          <span>{timeAgo(lastSession)}</span>
        </div>
      </div>
    </button>
  );
}
