"use client";

import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Circle,
  CheckCircle2,
  Loader2,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Curriculum } from "@/lib/types/learning";
import { cn } from "@/lib/utils";

interface CheckpointStatus {
  passed: boolean;
  score: number;
  attemptCount: number;
}

interface SidebarLeftProps {
  curriculum: Curriculum | null;
  activeModuleId: number | null;
  activeSubtopicId: string | null;
  loadedModuleId: number | null;
  completedSubtopics?: Set<string>;
  checkpoints?: Map<number, CheckpointStatus>;
  isLoading: boolean;
  onSubtopicClick: (moduleId: number, subtopicId: string) => void;
  onStartQuiz?: (moduleId: number) => void;
}

export function SidebarLeft({
  curriculum,
  activeModuleId,
  activeSubtopicId,
  loadedModuleId,
  completedSubtopics = new Set(),
  checkpoints = new Map(),
  isLoading,
  onSubtopicClick,
  onStartQuiz,
}: SidebarLeftProps) {
  const [expandedModules, setExpandedModules] = useState<Set<number>>(
    new Set([1])
  );

  const toggleModule = (moduleId: number) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  if (!curriculum) {
    return (
      <div className="flex h-full flex-col overflow-hidden bg-sidebar">
        <div className="flex items-center gap-2.5 border-b border-sidebar-border px-4 py-3">
          <BookOpen className="size-5 text-sidebar-foreground/70" />
          <span className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/70">
            Contents
          </span>
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="flex flex-col items-center gap-3">
            {isLoading ? (
              <>
                <Loader2 className="size-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Building curriculum...
                </p>
              </>
            ) : (
              <>
                <BookOpen className="size-10 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">
                  No topic selected
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-sidebar">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2.5 border-b border-sidebar-border px-4 py-3">
        <BookOpen className="size-5 text-sidebar-foreground/70" />
        <span className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/70">
          Contents
        </span>
      </div>

      {/* Module list */}
      <ScrollArea className="min-h-0 flex-1 [&_[data-slot=scroll-area-viewport]>div]:!block">
        <nav className="space-y-2 p-3">
          {curriculum.modules.map((module) => {
            const isExpanded = expandedModules.has(module.id);
            const isLoaded = module.id === loadedModuleId;
            const completedCount = module.subtopics.filter((s) =>
              completedSubtopics.has(s.id)
            ).length;
            const totalCount = module.subtopics.length;
            const allSubtopicsCompleted =
              completedCount === totalCount && totalCount > 0;
            const cp = checkpoints.get(module.id);
            const modulePercent =
              totalCount > 0
                ? Math.round((completedCount / totalCount) * 100)
                : 0;

            return (
              <div
                key={module.id}
                className={cn(
                  "overflow-hidden rounded-lg transition-colors",
                  isLoaded
                    ? "bg-sidebar-accent/60"
                    : isExpanded
                      ? "bg-sidebar-accent/30"
                      : ""
                )}
              >
                {/* Module header */}
                <button
                  onClick={() => toggleModule(module.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                    isLoaded
                      ? "text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/40"
                  )}
                >
                  {isExpanded ? (
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  )}

                  {/* Module status icon */}
                  {cp?.passed ? (
                    <CheckCircle2 className="size-4 shrink-0 text-green-600 dark:text-green-400" />
                  ) : completedCount > 0 ? (
                    <div className="relative flex size-4 shrink-0 items-center justify-center">
                      <Circle className="size-4 text-primary/30" />
                      <div
                        className="absolute inset-0 rounded-full border-2 border-primary"
                        style={{
                          clipPath: `polygon(50% 50%, 50% 0%, ${completedCount >= totalCount / 2 ? "100% 0%, 100% 100%, 0% 100%, 0% 0%," : `${50 + 50 * Math.sin((completedCount / totalCount) * 2 * Math.PI)}% ${50 - 50 * Math.cos((completedCount / totalCount) * 2 * Math.PI)}%,`} 50% 50%)`,
                        }}
                      />
                    </div>
                  ) : (
                    <Circle className="size-4 shrink-0 text-muted-foreground/30" />
                  )}

                  <div className="min-w-0 flex-1 overflow-hidden">
                    <span className="block truncate text-sm font-medium">
                      {module.id}. {module.title}
                    </span>
                    {isExpanded && (
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${modulePercent}%` }}
                          />
                        </div>
                        <span
                          className={cn(
                            "shrink-0 text-xs tabular-nums",
                            cp?.passed
                              ? "text-green-600 dark:text-green-400"
                              : completedCount > 0
                                ? "text-primary"
                                : "text-muted-foreground"
                          )}
                        >
                          {completedCount}/{totalCount}
                        </span>
                      </div>
                    )}
                  </div>

                  {!isExpanded && (
                    <span
                      className={cn(
                        "shrink-0 rounded-md px-1.5 py-0.5 text-xs tabular-nums",
                        cp?.passed
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : completedCount > 0
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground"
                      )}
                    >
                      {completedCount}/{totalCount}
                    </span>
                  )}
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="overflow-hidden pb-2">
                    {/* Subtopics */}
                    <div className="ml-5 overflow-hidden border-l-2 border-sidebar-border pl-2">
                      {module.subtopics.map((subtopic) => {
                        const isSubActive =
                          subtopic.id === activeSubtopicId;
                        const isCompleted =
                          completedSubtopics.has(subtopic.id);

                        return (
                          <button
                            key={subtopic.id}
                            onClick={() =>
                              onSubtopicClick(module.id, subtopic.id)
                            }
                            className={cn(
                              "flex w-full items-center gap-2 overflow-hidden rounded-md px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                              isSubActive
                                ? "bg-primary/10 text-foreground font-medium"
                                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                            )}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="size-4 shrink-0 text-green-600 dark:text-green-400" />
                            ) : isSubActive && isLoading ? (
                              <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
                            ) : (
                              <Circle className="size-4 shrink-0 text-muted-foreground/30" />
                            )}
                            <span className="min-w-0 flex-1 truncate text-sm">
                              {subtopic.title}
                            </span>
                            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                              {subtopic.estimated_minutes}m
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Checkpoint */}
                    {(() => {
                      if (cp?.passed) {
                        return (
                          <div className="mx-3 mt-2 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 dark:border-green-800 dark:bg-green-900/20">
                            <CheckCircle2 className="size-4 shrink-0 text-green-600 dark:text-green-400" />
                            <span className="text-sm font-medium text-green-700 dark:text-green-400">
                              Passed ({cp.score}%)
                            </span>
                          </div>
                        );
                      }
                      if (allSubtopicsCompleted && onStartQuiz) {
                        return (
                          <div className="mx-3 mt-2">
                            <Button
                              variant={cp ? "outline" : "default"}
                              size="sm"
                              className="w-full gap-2"
                              onClick={() => onStartQuiz(module.id)}
                            >
                              <ClipboardCheck className="size-4" />
                              {cp
                                ? `Retry Quiz (${cp.attemptCount})`
                                : "Take Quiz"}
                            </Button>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="shrink-0 border-t border-sidebar-border px-4 py-2.5 text-sm text-muted-foreground">
        {curriculum.modules.length} modules &middot;{" "}
        {curriculum.estimated_total_minutes} min
      </div>
    </div>
  );
}
