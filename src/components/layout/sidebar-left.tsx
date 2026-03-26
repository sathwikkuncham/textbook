"use client";

import {
  FolderTree,
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
      <div className="flex h-full flex-col bg-sidebar">
        <div className="flex items-center gap-2 border-b border-sidebar-border px-3 py-2">
          <FolderTree className="size-4 text-sidebar-foreground/70" />
          <span className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/70">
            Explorer
          </span>
        </div>
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Building curriculum..." : "No topic selected"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex items-center gap-2 border-b border-sidebar-border px-3 py-2">
        <FolderTree className="size-4 text-sidebar-foreground/70" />
        <span className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/70">
          {curriculum.topic}
        </span>
      </div>
      <ScrollArea className="flex-1">
        <nav className="py-2 pl-2 pr-3">
          {curriculum.modules.map((module) => {
            const isExpanded = expandedModules.has(module.id);
            const isLoaded = module.id === loadedModuleId;
            const completedCount = module.subtopics.filter((s) =>
              completedSubtopics.has(s.id)
            ).length;
            const totalCount = module.subtopics.length;
            const allSubtopicsCompleted = completedCount === totalCount;
            const cp = checkpoints.get(module.id);

            // Module icon: check if passed, circle if in progress
            const moduleIcon = cp?.passed ? (
              <CheckCircle2 className="size-3.5 shrink-0 text-green-600 dark:text-green-400" />
            ) : completedCount > 0 ? (
              <div className="relative flex size-3.5 shrink-0 items-center justify-center">
                <Circle className="size-3.5 text-primary/40" />
                <div
                  className="absolute inset-0 rounded-full border-[1.5px] border-primary"
                  style={{
                    clipPath: `polygon(50% 50%, 50% 0%, ${completedCount >= totalCount / 2 ? "100% 0%, 100% 100%, 0% 100%, 0% 0%," : `${50 + 50 * Math.sin((completedCount / totalCount) * 2 * Math.PI)}% ${50 - 50 * Math.cos((completedCount / totalCount) * 2 * Math.PI)}%,`} 50% 50%)`,
                  }}
                />
              </div>
            ) : (
              <Circle className="size-3.5 shrink-0 text-muted-foreground/40" />
            );

            return (
              <div key={module.id} className="mb-1">
                {/* Module header */}
                <button
                  onClick={() => toggleModule(module.id)}
                  className={cn(
                    "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                    isLoaded
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  {isExpanded ? (
                    <ChevronDown className="size-3.5 shrink-0" />
                  ) : (
                    <ChevronRight className="size-3.5 shrink-0" />
                  )}
                  {moduleIcon}
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {module.id}. {module.title}
                  </span>
                  {/* Subtopic counter */}
                  <span
                    className={cn(
                      "shrink-0 rounded px-1 py-0.5 text-[10px] tabular-nums",
                      cp?.passed
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : completedCount > 0
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {completedCount}/{totalCount}
                  </span>
                </button>

                {isExpanded && (
                  <>
                    {/* Subtopics */}
                    <div className="ml-4 mt-0.5 border-l border-sidebar-border pl-2">
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
                              "flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs transition-colors",
                              isSubActive
                                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/30"
                            )}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="size-3 shrink-0 text-green-600 dark:text-green-400" />
                            ) : isSubActive && isLoading ? (
                              <Loader2 className="size-3 shrink-0 animate-spin text-primary" />
                            ) : (
                              <Circle className="size-3 shrink-0 text-muted-foreground/40" />
                            )}
                            <span className="min-w-0 flex-1 truncate">
                              {subtopic.title}
                            </span>
                            <span className="shrink-0 rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                              {subtopic.estimated_minutes}m
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Checkpoint section — visually separated from subtopics */}
                    {(() => {
                      if (cp?.passed) {
                        return (
                          <div className="mx-2 mt-2 flex items-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-2.5 py-1.5 dark:border-green-800 dark:bg-green-900/20">
                            <CheckCircle2 className="size-3.5 shrink-0 text-green-600 dark:text-green-400" />
                            <span className="text-xs font-medium text-green-700 dark:text-green-400">
                              Passed ({cp.score}%)
                            </span>
                          </div>
                        );
                      }
                      if (allSubtopicsCompleted && onStartQuiz) {
                        return (
                          <div className="mx-2 mt-2">
                            <Button
                              variant={cp ? "outline" : "default"}
                              size="xs"
                              className="w-full gap-1.5"
                              onClick={() => onStartQuiz(module.id)}
                            >
                              <ClipboardCheck className="size-3" />
                              {cp
                                ? `Retry Quiz (${cp.attemptCount})`
                                : "Take Quiz"}
                            </Button>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </>
                )}
              </div>
            );
          })}
        </nav>
      </ScrollArea>
      <div className="border-t border-sidebar-border px-3 py-2 text-xs text-muted-foreground">
        {curriculum.modules.length} modules &middot;{" "}
        {curriculum.estimated_total_minutes} min
      </div>
    </div>
  );
}
