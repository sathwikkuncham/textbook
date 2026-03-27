import { BookOpenText, Search, PenTool, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { LearningPhase } from "@/hooks/use-learning-state";

interface StatusBarProps {
  activeModuleTitle: string | null;
  phase: LearningPhase;
  completionPercent: number;
  reviewsDueCount: number;
  onReviewsClick?: () => void;
}

const PHASE_LABELS: Record<LearningPhase, { icon: React.ElementType; label: string }> = {
  idle: { icon: BookOpenText, label: "Ready" },
  scoping: { icon: Search, label: "Scoping topic..." },
  researching: { icon: Search, label: "Researching..." },
  designing: { icon: PenTool, label: "Designing curriculum..." },
  learning: { icon: BookOpenText, label: "Learning" },
  assessing: { icon: PenTool, label: "Assessment" },
};

export function StatusBar({
  activeModuleTitle,
  phase,
  completionPercent,
  reviewsDueCount,
  onReviewsClick,
}: StatusBarProps) {
  const phaseInfo = PHASE_LABELS[phase];
  const Icon = phaseInfo.icon;
  const isActive = phase !== "idle";

  return (
    <div
      data-slot="status-bar"
      className="flex h-6 shrink-0 select-none items-center justify-between border-t border-border bg-[image:var(--gradient-primary)] px-3 text-xs text-white"
    >
      <div className="flex items-center gap-1.5">
        {isActive && phase !== "learning" && phase !== "assessing" ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <Icon className="size-3" />
        )}
        <span>{activeModuleTitle ?? phaseInfo.label}</span>
      </div>

      <span>{completionPercent}% Complete</span>

      {reviewsDueCount > 0 ? (
        <button
          onClick={onReviewsClick}
          className="cursor-pointer"
        >
          <Badge
            variant="secondary"
            className="h-4 rounded-sm px-1.5 text-[10px] leading-none"
          >
            {reviewsDueCount} review{reviewsDueCount !== 1 ? "s" : ""} due
          </Badge>
        </button>
      ) : (
        <Badge
          variant="secondary"
          className="h-4 rounded-sm px-1.5 text-[10px] leading-none"
        >
          No reviews due
        </Badge>
      )}
    </div>
  );
}
