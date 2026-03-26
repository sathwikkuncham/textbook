"use client";

import { useRouter } from "next/navigation";
import { BookOpen, Clock, Layers } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

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
}

const SOURCE_BADGES: Record<string, string> = {
  pdf: "PDF",
  url: "URL",
  markdown: "MD",
};

const LEVEL_STYLES: Record<string, string> = {
  beginner: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  intermediate: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  advanced: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
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
}: TopicCardProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(`/learn/${slug}`)}
      className="group flex w-full flex-col rounded-lg border border-border bg-card p-5 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="size-4 text-primary" />
          <h3 className="font-serif text-base font-semibold text-card-foreground group-hover:text-primary transition-colors">
            {displayName}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {sourceType && SOURCE_BADGES[sourceType] && (
            <Badge
              variant="outline"
              className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
            >
              {SOURCE_BADGES[sourceType]}
            </Badge>
          )}
          <Badge
            variant="outline"
            className={`text-[10px] ${LEVEL_STYLES[level] ?? ""}`}
          >
            {level}
          </Badge>
        </div>
      </div>

      <p className="mb-4 text-xs text-muted-foreground">{goal}</p>

      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span>{Math.round(completionPercent)}%</span>
        </div>
        <Progress value={completionPercent} />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Layers className="size-3" />
            {totalModules} modules
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {estimatedMinutes}m
          </span>
        </div>
        <span>{timeAgo(lastSession)}</span>
      </div>
    </button>
  );
}
