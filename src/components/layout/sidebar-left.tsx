"use client";

import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Circle,
  CheckCircle2,
  Loader2,
  ClipboardCheck,
  Lock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Curriculum } from "@/lib/types/learning";
import type { ModuleGenerationProgress } from "@/hooks/use-learning-state";
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
  onGenerateModule?: (moduleId: number) => void;
  onSelectModule?: (moduleId: number) => void;
  generationProgress?: ModuleGenerationProgress | null;
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
  onGenerateModule,
  onSelectModule,
  generationProgress,
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
      <ScrollArea className="min-h-0 flex-1">
        <nav className="space-y-2 p-3">
          {curriculum.modules.map((module) => {
            const isExpanded = expandedModules.has(module.id);
            const isLoaded = module.id === loadedModuleId;
            const isUngenerated = !!module.plan && !module.generated;
            const isGenerating = generationProgress?.moduleId === module.id
              && (generationProgress.status === "planning" || generationProgress.status === "generating");

            // Check if this module is locked (previous module not generated yet)
            const moduleIdx = curriculum.modules.findIndex((m) => m.id === module.id);
            const prevModule = moduleIdx > 0 ? curriculum.modules[moduleIdx - 1] : null;
            const isPrevUngenerated = prevModule?.plan && !prevModule?.generated;
            const isLocked = isUngenerated && isPrevUngenerated && moduleIdx > 0;

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
                  onClick={() => {
                    toggleModule(module.id);
                    // For ungenerated modules, select the module to show plan in main content
                    if (isUngenerated && !isLocked && onSelectModule) {
                      onSelectModule(module.id);
                    }
                  }}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                    isLoaded
                      ? "text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/40"
                  )}
                >
                  {isExpanded ? (
                    <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  )}

                  {/* Module status icon */}
                  {isGenerating ? (
                    <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-primary" />
                  ) : isLocked ? (
                    <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground/30" />
                  ) : isUngenerated ? (
                    <Sparkles className="mt-0.5 size-4 shrink-0 text-primary/60" />
                  ) : cp?.passed ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600 dark:text-green-400" />
                  ) : completedCount > 0 ? (
                    <div className="relative mt-0.5 flex size-4 shrink-0 items-center justify-center">
                      <Circle className="size-4 text-primary/30" />
                      <div
                        className="absolute inset-0 rounded-full border-2 border-primary"
                        style={{
                          clipPath: `polygon(50% 50%, 50% 0%, ${completedCount >= totalCount / 2 ? "100% 0%, 100% 100%, 0% 100%, 0% 0%," : `${50 + 50 * Math.sin((completedCount / totalCount) * 2 * Math.PI)}% ${50 - 50 * Math.cos((completedCount / totalCount) * 2 * Math.PI)}%,`} 50% 50%)`,
                        }}
                      />
                    </div>
                  ) : (
                    <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground/30" />
                  )}

                  <div className="min-w-0 flex-1 overflow-hidden">
                    <span className="block text-sm font-medium">
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
                    isUngenerated ? (
                      isGenerating ? (
                        <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin text-primary" />
                      ) : (
                        <span className="mt-0.5 shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          {isLocked ? "Locked" : "Ready"}
                        </span>
                      )
                    ) : (
                      <span
                        className={cn(
                          "mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-xs tabular-nums",
                          cp?.passed
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : completedCount > 0
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground"
                        )}
                      >
                        {completedCount}/{totalCount}
                      </span>
                    )
                  )}
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="overflow-hidden pb-2">
                    {/* Ungenerated module — show plan + generate button */}
                    {isUngenerated && module.plan ? (
                      <div className="mx-3 space-y-2">
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          <span className="font-medium text-foreground/80">Goal:</span>{" "}
                          {module.plan.goal}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {module.plan.concepts.slice(0, 8).map((c) => (
                            <span
                              key={c}
                              className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
                            >
                              {c}
                            </span>
                          ))}
                          {module.plan.concepts.length > 8 && (
                            <span className="text-[11px] text-muted-foreground/60">
                              +{module.plan.concepts.length - 8} more
                            </span>
                          )}
                        </div>

                        {isGenerating && generationProgress ? (
                          <div className="space-y-1.5 rounded-lg border border-primary/20 bg-primary/5 p-2.5">
                            <div className="flex items-center gap-2">
                              <Loader2 className="size-3.5 animate-spin text-primary" />
                              <span className="text-xs font-medium text-primary">
                                {generationProgress.status === "planning"
                                  ? "Planning sections..."
                                  : `Generating section ${generationProgress.currentSection}${generationProgress.totalEstimate > 0 ? ` of ~${generationProgress.totalEstimate}` : ""}...`}
                              </span>
                            </div>
                            {generationProgress.currentSectionTitle && (
                              <p className="text-xs text-muted-foreground">
                                {generationProgress.currentSectionTitle}
                              </p>
                            )}
                            {generationProgress.completedSections.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {generationProgress.completedSections.map((s, i) => (
                                  <div key={i} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                    <CheckCircle2 className="size-3 text-green-600 dark:text-green-400" />
                                    {s.title}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : isLocked ? (
                          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                            <Lock className="size-3.5 text-muted-foreground/50" />
                            <span className="text-xs text-muted-foreground/60">
                              Complete the previous module first
                            </span>
                          </div>
                        ) : onGenerateModule ? (
                          <Button
                            variant="default"
                            size="sm"
                            className="w-full gap-2"
                            onClick={() => onGenerateModule(module.id)}
                          >
                            <Sparkles className="size-3.5" />
                            Generate Module
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                      <>
                        {/* Subtopics — shown for generated modules */}
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
                                  "flex w-full items-start gap-2 overflow-hidden rounded-md px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                                  isSubActive
                                    ? "bg-primary/10 text-foreground font-medium"
                                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                                )}
                              >
                                {isCompleted ? (
                                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600 dark:text-green-400" />
                                ) : isSubActive && isLoading ? (
                                  <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-primary" />
                                ) : (
                                  <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground/30" />
                                )}
                                <span className="min-w-0 flex-1 text-sm">
                                  {subtopic.title}
                                </span>
                                <span className="mt-0.5 shrink-0 text-xs tabular-nums text-muted-foreground">
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
                      </>
                    )}
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
        {curriculum.estimated_total_minutes >= 60
          ? `${Math.floor(curriculum.estimated_total_minutes / 60)}h ${curriculum.estimated_total_minutes % 60 > 0 ? `${curriculum.estimated_total_minutes % 60}m` : ""}`
          : `${curriculum.estimated_total_minutes}m`}
      </div>
    </div>
  );
}
