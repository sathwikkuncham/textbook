"use client";

import { useRouter } from "next/navigation";
import {
  Loader2,
  Settings,
  ArrowLeft,
  Search,
  PanelLeft,
  MessageSquare,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { LearningPhase } from "@/hooks/use-learning-state";

interface TopBarProps {
  phase: LearningPhase;
  topic: string | null;
  topicSlug?: string;
  isLoading: boolean;
  completionPercent: number;
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
  leftSidebarOpen?: boolean;
  rightSidebarOpen?: boolean;
  onToggleLeftSidebar?: () => void;
  onToggleRightSidebar?: () => void;
}

export function TopBar({
  phase,
  topic,
  topicSlug,
  isLoading,
  completionPercent,
  leftSidebarOpen,
  rightSidebarOpen,
  onToggleLeftSidebar,
  onToggleRightSidebar,
}: TopBarProps) {
  const router = useRouter();
  const { setOpen: openPalette } = useCommandPalette();

  return (
    <div
      data-slot="top-bar"
      className="flex h-12 shrink-0 items-center border-b border-border bg-card px-2 md:px-4"
    >
      {/* Left group: back + contents toggle + logo + title */}
      <div className="flex min-w-0 items-center">
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

        {/* Contents toggle — labeled pill button */}
        {onToggleLeftSidebar && (
          <button
            onClick={onToggleLeftSidebar}
            className={cn(
              "ml-1 hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors md:inline-flex",
              leftSidebarOpen
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <PanelLeft className="size-3.5" />
            Contents
          </button>
        )}

        <div className="ml-2 flex min-w-0 items-center gap-1.5 md:ml-3 md:gap-2">
          <span className="shrink-0 font-serif text-sm font-bold text-foreground md:text-base">
            C<span className="text-primary">.</span>
          </span>
          <span className="truncate font-serif text-sm font-semibold text-card-foreground">
            {topic ?? "Loading..."}
          </span>
          {isLoading && (
            <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" />
          )}
        </div>
      </div>

      {/* Center: progress */}
      <div className="ml-4 hidden items-center gap-1.5 md:flex md:gap-2">
        <Progress value={completionPercent} className="w-24" />
        <span className="text-xs tabular-nums text-muted-foreground">
          {completionPercent}%
        </span>
      </div>

      {/* Right group: AI chat toggle + utilities */}
      <div className="ml-auto flex items-center gap-1">
        {/* AI Chat toggle — prominent labeled pill */}
        {onToggleRightSidebar && (
          <button
            onClick={onToggleRightSidebar}
            className={cn(
              "hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors md:inline-flex",
              rightSidebarOpen
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <MessageSquare className="size-3.5" />
            AI Chat
          </button>
        )}

        <div className="ml-1 h-4 w-px bg-border" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => openPalette(true)}
            >
              <Search className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Search (Ctrl+K)</TooltipContent>
        </Tooltip>
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
