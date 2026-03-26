"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  Focus,
  SkipForward,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type {
  SourceToc,
  TocChapter,
  UserScopeSelection,
} from "@/lib/types/learning";
import { cn } from "@/lib/utils";

interface ScopeTreeProps {
  toc: SourceToc;
  scope: UserScopeSelection;
  onScopeChange: (scope: UserScopeSelection) => void;
}

type Priority = "normal" | "skip" | "deep";

export function ScopeTree({ toc, scope, onScopeChange }: ScopeTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(toc.chapters.slice(0, 3).map((ch) => ch.id))
  );

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isIncluded = (id: string) => scope.included.includes(id);

  const toggleInclude = (chapter: TocChapter) => {
    const included = isIncluded(chapter.id);
    const newIncluded = included
      ? scope.included.filter((i) => i !== chapter.id)
      : [...scope.included, chapter.id];
    const newExcluded = included
      ? [...scope.excluded, chapter.id]
      : scope.excluded.filter((i) => i !== chapter.id);

    const newPriorities = { ...scope.priorities };
    if (included) {
      delete newPriorities[chapter.id];
    } else {
      newPriorities[chapter.id] = "normal";
    }

    onScopeChange({
      included: newIncluded,
      excluded: newExcluded,
      priorities: newPriorities,
    });
  };

  const cyclePriority = (chapterId: string) => {
    const current = scope.priorities[chapterId] ?? "normal";
    const next: Priority =
      current === "normal" ? "deep" : current === "deep" ? "skip" : "normal";

    const newPriorities = { ...scope.priorities, [chapterId]: next };

    if (next === "skip") {
      onScopeChange({
        included: scope.included.filter((i) => i !== chapterId),
        excluded: [...scope.excluded.filter((i) => i !== chapterId), chapterId],
        priorities: newPriorities,
      });
    } else {
      onScopeChange({
        included: scope.included.includes(chapterId)
          ? scope.included
          : [...scope.included, chapterId],
        excluded: scope.excluded.filter((i) => i !== chapterId),
        priorities: newPriorities,
      });
    }
  };

  const PRIORITY_STYLES: Record<Priority, { label: string; class: string; icon: React.ElementType }> = {
    normal: { label: "Normal", class: "bg-secondary text-secondary-foreground", icon: BookOpen },
    deep: { label: "Deep Focus", class: "bg-primary/10 text-primary", icon: Focus },
    skip: { label: "Skip", class: "bg-muted text-muted-foreground line-through", icon: SkipForward },
  };

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-4">
        {toc.chapters.map((chapter) => {
          const included = isIncluded(chapter.id);
          const priority = scope.priorities[chapter.id] ?? "normal";
          const isExpanded = expanded.has(chapter.id);
          const priorityInfo = PRIORITY_STYLES[priority];
          const pages = chapter.pageEnd - chapter.pageStart;

          return (
            <div key={chapter.id} className="mb-2">
              <div
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2.5 transition-colors",
                  priority === "skip"
                    ? "bg-muted/50 opacity-60"
                    : included
                      ? "bg-card border border-border"
                      : "bg-muted/30"
                )}
              >
                <button
                  onClick={() => toggleExpand(chapter.id)}
                  aria-label={`${isExpanded ? "Collapse" : "Expand"} ${chapter.title}`}
                  className="shrink-0 text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                </button>

                <Checkbox
                  checked={included}
                  onCheckedChange={() => toggleInclude(chapter)}
                  aria-label={`Toggle ${chapter.title}`}
                />

                <span
                  className={cn(
                    "flex-1 text-sm font-medium",
                    priority === "skip"
                      ? "line-through text-muted-foreground"
                      : "text-foreground"
                  )}
                >
                  {chapter.title}
                </span>

                <span className="text-xs text-muted-foreground">
                  {pages > 0 ? `${pages}p` : ""}
                </span>

                {included && priority !== "skip" && (
                  <button
                    onClick={() => cyclePriority(chapter.id)}
                    title={`Priority: ${priorityInfo.label}. Click to change.`}
                    className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <Badge
                      variant="outline"
                      className={cn(
                        "cursor-pointer text-[10px]",
                        priorityInfo.class
                      )}
                    >
                      {priorityInfo.label}
                    </Badge>
                  </button>
                )}
              </div>

              {isExpanded && chapter.sections.length > 0 && (
                <div className="ml-8 mt-1 space-y-0.5 border-l border-border pl-3">
                  {chapter.sections.map((section) => (
                    <div
                      key={section.id}
                      className={cn(
                        "rounded px-2 py-1 text-xs",
                        included
                          ? "text-foreground/80"
                          : "text-muted-foreground/50"
                      )}
                    >
                      {section.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
