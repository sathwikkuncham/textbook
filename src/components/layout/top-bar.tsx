"use client";

import { useRouter } from "next/navigation";
import { BookOpen, Loader2, Settings, ArrowLeft } from "lucide-react";
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
}

export function TopBar({
  phase,
  topic,
  topicSlug,
  isLoading,
  completionPercent,
}: TopBarProps) {
  const router = useRouter();

  return (
    <div
      data-slot="top-bar"
      className="flex h-12 shrink-0 items-center border-b border-border bg-card px-4"
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

      <div className="ml-2 flex items-center gap-2">
        <BookOpen className="size-5 text-primary" />
        <span className="font-serif text-sm font-semibold text-card-foreground">
          {topic ?? "Loading..."}
        </span>
      </div>

      {isLoading && (
        <Loader2 className="ml-3 size-4 animate-spin text-primary" />
      )}

      <div className="ml-6 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Progress</span>
        <Progress value={completionPercent} className="w-32" />
        <span className="text-xs text-muted-foreground">
          {completionPercent}%
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1">
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
