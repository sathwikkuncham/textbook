"use client";

import { useRouter } from "next/navigation";
import { BookOpen, Loader2, Settings, ArrowLeft, Maximize, Minimize } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { LearningPhase } from "@/hooks/use-learning-state";

interface TopBarProps {
  phase: LearningPhase;
  topic: string | null;
  topicSlug?: string;
  isLoading: boolean;
  completionPercent: number;
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
}

export function TopBar({
  phase,
  topic,
  topicSlug,
  isLoading,
  completionPercent,
  focusMode,
  onToggleFocusMode,
}: TopBarProps) {
  const router = useRouter();

  return (
    <div
      data-slot="top-bar"
      className="flex h-12 shrink-0 items-center border-b border-border bg-card px-2 md:px-4"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Back to topics</TooltipContent>
      </Tooltip>

      <div className="ml-1.5 flex min-w-0 items-center gap-1.5 md:ml-2 md:gap-2">
        <BookOpen className="size-4 shrink-0 text-primary md:size-5" />
        <span className="truncate font-serif text-sm font-semibold text-card-foreground">
          {topic ?? "Loading..."}
        </span>
      </div>

      {isLoading && (
        <Loader2 className="ml-2 size-4 shrink-0 animate-spin text-primary md:ml-3" />
      )}

      <div className="ml-2 flex items-center gap-1.5 md:ml-6 md:gap-2">
        <span className="hidden text-xs text-muted-foreground md:inline">Progress</span>
        <Progress value={completionPercent} className="w-16 md:w-32" />
        <span className="text-xs tabular-nums text-muted-foreground">
          {completionPercent}%
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1">
        {onToggleFocusMode && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onToggleFocusMode}
                className="hidden md:inline-flex"
              >
                {focusMode ? (
                  <Minimize className="size-4" />
                ) : (
                  <Maximize className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {focusMode ? "Exit focus mode (Esc)" : "Focus mode (Ctrl+Shift+F)"}
            </TooltipContent>
          </Tooltip>
        )}
        <ThemeToggle />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                if (topicSlug) router.push(`/learn/${topicSlug}/settings`);
              }}
            >
              <Settings className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Settings</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
