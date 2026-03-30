"use client";

import { Play, Pause, Loader2, Headphones } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  isPlaying: boolean;
  isLoading: boolean;
  hasAudio: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  onToggle: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Small inline button — shown next to content heading before audio starts */
export function AudioPlayButton({
  isPlaying,
  isLoading,
  onToggle,
}: {
  isPlaying: boolean;
  isLoading: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={isLoading}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
        isPlaying
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:border-primary/30 hover:text-primary",
        isLoading && "opacity-60"
      )}
      aria-label={isPlaying ? "Pause narration" : "Listen to this lesson"}
    >
      {isLoading ? (
        <Loader2 className="size-3 animate-spin" />
      ) : isPlaying ? (
        <Pause className="size-3" />
      ) : (
        <Headphones className="size-3" />
      )}
      {isLoading ? "Generating..." : isPlaying ? "Listening" : "Listen"}
    </button>
  );
}

/** Compact progress bar — only appears after audio starts playing */
export function AudioProgressBar({
  isPlaying,
  isLoading,
  progress,
  currentTime,
  duration,
  onToggle,
}: AudioPlayerProps) {
  if (!isPlaying && !isLoading && duration === 0) return null;

  return (
    <div className="mx-auto mb-6 flex max-w-4xl items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5 shadow-sm">
      <button
        onClick={onToggle}
        disabled={isLoading}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-primary p-1.5 text-primary-foreground transition-opacity",
          isLoading && "opacity-60"
        )}
      >
        {isLoading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : isPlaying ? (
          <Pause className="size-3.5" />
        ) : (
          <Play className="size-3.5 pl-0.5" />
        )}
      </button>

      <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-[image:var(--gradient-primary)] transition-[width] duration-200"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>
  );
}
