"use client";

import React, { useRef, useMemo, memo, useState, useEffect } from "react";
import { BookOpen, ChevronLeft, ChevronRight, RefreshCw, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MermaidDiagram } from "@/components/ui/mermaid-diagram";
import { TextSelectionToolbar } from "@/components/chat/text-selection-toolbar";
import { AudioPlayButton, AudioProgressBar } from "@/components/ui/audio-player";
import { LearningRecommendations } from "@/components/ui/learning-recommendations";
import type { LearningPhase } from "@/hooks/use-learning-state";
import type { Curriculum } from "@/lib/types/learning";
import type { useAudioPlayer } from "@/hooks/use-audio-player";

// ── Section splitting ──────────────────────────────────────

interface ContentSection {
  index: number;
  title: string;
  body: string;
}

function splitContentSections(markdown: string): { preamble: string; sections: ContentSection[] } {
  const sectionRegex = /^(###\s+(\d+)\.\s+(.+))$/gm;
  const splits: { index: number; title: string; headerLine: string; start: number }[] = [];

  let match;
  while ((match = sectionRegex.exec(markdown)) !== null) {
    splits.push({
      index: parseInt(match[2], 10) - 1,
      title: match[3].trim(),
      headerLine: match[1],
      start: match.index,
    });
  }

  if (splits.length === 0) {
    return { preamble: markdown, sections: [] };
  }

  const preamble = markdown.slice(0, splits[0].start).trim();
  const sections: ContentSection[] = splits.map((split, i) => {
    const bodyStart = split.start + split.headerLine.length;
    const bodyEnd = i + 1 < splits.length ? splits[i + 1].start : markdown.length;
    return {
      index: split.index,
      title: split.title,
      body: markdown.slice(bodyStart, bodyEnd).trim(),
    };
  });

  return { preamble, sections };
}

// ── Markdown component map (shared) ────────────────────────

const markdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="mb-6 border-b border-border pb-3 font-serif text-xl font-bold tracking-tight text-foreground md:text-2xl">
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="mb-4 mt-10 border-b border-border/50 pb-2 font-serif text-lg font-semibold tracking-tight text-foreground md:text-xl">
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => {
    const text = String(children);
    const isSectionHeader = /^\d+\.\s/.test(text);

    if (isSectionHeader) {
      return (
        <h3 className="mb-3 mt-6 text-base font-semibold text-primary">
          {children}
        </h3>
      );
    }
    return (
      <h3 className="mb-2 mt-4 text-base font-semibold text-foreground">
        {children}
      </h3>
    );
  },
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-4 leading-relaxed text-foreground/90">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-4 ml-6 list-disc space-y-1 text-foreground/90">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-4 ml-6 list-decimal space-y-1 text-foreground/90">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-7">{children}</li>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="mb-4 border-l-4 border-primary/30 pl-4 italic text-muted-foreground">
      {children}
    </blockquote>
  ),
  code: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
    const isMermaid = className?.includes("language-mermaid");
    if (isMermaid) {
      const chart = String(children).trim();
      return <MermaidDiagram chart={chart} />;
    }

    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <code className="block whitespace-pre font-mono text-[13px] leading-[1.45] text-foreground">
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground">
        {children}
      </code>
    );
  },
  pre: ({ children }: { children?: React.ReactNode }) => {
    const child = children as React.ReactElement<{ className?: string }>;
    if (child?.props?.className?.includes("language-mermaid")) {
      return <>{children}</>;
    }
    return (
      <pre className="mb-4 overflow-x-auto rounded-lg border border-border bg-muted/50 p-4 font-mono text-[13px] leading-[1.45]">
        {children}
      </pre>
    );
  },
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="mb-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="border-b border-border bg-muted/50">{children}</thead>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="px-3 py-2 text-left font-semibold text-foreground">{children}</th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="border-b border-border/30 px-3 py-2 text-foreground/90">{children}</td>
  ),
  hr: () => <hr className="my-8 border-border" />,
};

// ── Memoized section body ──────────────────────────────────

const MemoizedSectionBody = memo(function MemoizedSectionBody({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {markdown}
    </ReactMarkdown>
  );
});

// ── Sub-components ─────────────────────────────────────────

interface SubtopicNavInfo {
  moduleId: number;
  subtopicId: string;
  moduleTitle: string;
  subtopicTitle: string;
}

interface MainContentProps {
  phase: LearningPhase;
  content: string | null;
  isLoading: boolean;
  error: string | null;
  activeModuleTitle?: string;
  onTextSelectionAction?: (action: string, selectedText: string) => void;
  quizContent?: React.ReactNode;
  curriculum?: Curriculum | null;
  activeModuleId?: number | null;
  activeSubtopicId?: string | null;
  onNavigateSubtopic?: (moduleId: number, subtopicId: string) => void;
  activeSectionIndex?: number | null;
  audioPlayer?: ReturnType<typeof useAudioPlayer>;
  activeSubtopicTitle?: string;
  onRegenerate?: (feedback?: string) => void;
  onRollback?: () => void;
  hasPreviousVersion?: boolean;
  topicId?: number | null;
  onCurriculumChange?: () => void;
}

function ContentSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-4 md:px-8 md:py-6">
      <div className="mb-6 border-b border-border pb-3">
        <div className="h-7 w-1/2 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
      </div>
      <div className="mb-3 mt-10 h-6 w-2/5 animate-pulse rounded bg-muted" />
      <div className="space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-10/12 animate-pulse rounded bg-muted" />
        <div className="h-4 w-9/12 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-4 h-32 w-full animate-pulse rounded-lg border border-border bg-muted/50" />
      <div className="mb-3 mt-8 h-5 w-1/3 animate-pulse rounded bg-muted" />
      <div className="space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

function ReadyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <BookOpen className="mb-4 size-16 text-muted-foreground/20" />
      <p className="text-lg text-muted-foreground">
        Select a subtopic to start reading
      </p>
      <p className="mt-2 text-sm text-muted-foreground/60">
        Click any subtopic in the sidebar
      </p>
    </div>
  );
}

function ErrorState({ error }: { error: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2">
      <p className="text-sm font-medium text-destructive">Error</p>
      <p className="max-w-md text-center text-sm text-muted-foreground">
        {error}
      </p>
    </div>
  );
}

function useSubtopicNav(
  curriculum: Curriculum | null | undefined,
  activeModuleId: number | null | undefined,
  activeSubtopicId: string | null | undefined
): { prev: SubtopicNavInfo | null; next: SubtopicNavInfo | null; current: string | null } {
  return useMemo(() => {
    if (!curriculum || !activeModuleId || !activeSubtopicId) {
      return { prev: null, next: null, current: null };
    }

    const flat: SubtopicNavInfo[] = [];
    for (const mod of curriculum.modules) {
      for (const sub of mod.subtopics) {
        flat.push({
          moduleId: mod.id,
          subtopicId: sub.id,
          moduleTitle: mod.title,
          subtopicTitle: sub.title,
        });
      }
    }

    const currentIdx = flat.findIndex(
      (s) => s.moduleId === activeModuleId && s.subtopicId === activeSubtopicId
    );

    const currentLabel = currentIdx >= 0 ? `${flat[currentIdx].moduleTitle}` : null;

    return {
      prev: currentIdx > 0 ? flat[currentIdx - 1] : null,
      next: currentIdx >= 0 && currentIdx < flat.length - 1 ? flat[currentIdx + 1] : null,
      current: currentLabel,
    };
  }, [curriculum, activeModuleId, activeSubtopicId]);
}

function SubtopicNavBar({
  prev,
  next,
  onNavigate,
}: {
  prev: SubtopicNavInfo | null;
  next: SubtopicNavInfo | null;
  onNavigate: (moduleId: number, subtopicId: string) => void;
}) {
  if (!prev && !next) return null;

  return (
    <nav className="mt-10 flex items-stretch gap-3 border-t border-border pt-6">
      {prev ? (
        <button
          onClick={() => onNavigate(prev.moduleId, prev.subtopicId)}
          className="group flex flex-1 flex-col items-start gap-1 rounded-xl border border-border bg-card p-4 text-left transition-all duration-300 hover:border-primary/30 hover:shadow-[var(--shadow-glow-red)]"
        >
          <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <ChevronLeft className="size-3" />
            Previous
          </span>
          <span className="text-sm font-medium text-foreground line-clamp-1">
            {prev.subtopicTitle}
          </span>
        </button>
      ) : (
        <div className="flex-1" />
      )}

      {next ? (
        <button
          onClick={() => onNavigate(next.moduleId, next.subtopicId)}
          className="group flex flex-1 flex-col items-end gap-1 rounded-xl border border-border bg-card p-4 text-right transition-all duration-300 hover:border-primary/30 hover:shadow-[var(--shadow-glow-red)]"
        >
          <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Next
            <ChevronRight className="size-3" />
          </span>
          <span className="text-sm font-medium text-foreground line-clamp-1">
            {next.subtopicTitle}
          </span>
        </button>
      ) : (
        <div className="flex-1" />
      )}
    </nav>
  );
}

// ── Main component ─────────────────────────────────────────

export function MainContent({
  phase,
  content,
  isLoading,
  error,
  activeModuleTitle,
  onTextSelectionAction,
  quizContent,
  curriculum,
  activeModuleId,
  activeSubtopicId,
  onNavigateSubtopic,
  activeSectionIndex,
  audioPlayer,
  activeSubtopicTitle,
  onRegenerate,
  onRollback,
  hasPreviousVersion,
  topicId,
  onCurriculumChange,
}: MainContentProps) {
  const articleRef = useRef<HTMLElement>(null);
  const { prev, next } = useSubtopicNav(curriculum, activeModuleId, activeSubtopicId);

  const subtopicPosition = useMemo(() => {
    if (!curriculum || !activeModuleId || !activeSubtopicId) return null;
    const mod = curriculum.modules.find((m) => m.id === activeModuleId);
    if (!mod) return null;
    const idx = mod.subtopics.findIndex((s) => s.id === activeSubtopicId);
    if (idx < 0) return null;
    return { current: idx + 1, total: mod.subtopics.length };
  }, [curriculum, activeModuleId, activeSubtopicId]);

  const [showFeedback, setShowFeedback] = useState(false);

  // Track backward navigation (revisiting earlier modules)
  const prevModuleRef = useRef<number | null>(null);
  const [isBacktracking, setIsBacktracking] = useState(false);

  useEffect(() => {
    if (activeModuleId == null) return;
    if (prevModuleRef.current !== null && activeModuleId < prevModuleRef.current) {
      setIsBacktracking(true);
    } else {
      setIsBacktracking(false);
    }
    prevModuleRef.current = activeModuleId;
  }, [activeModuleId]);
  const [feedbackText, setFeedbackText] = useState("");

  const { preamble, sections } = useMemo(
    () => (content ? splitContentSections(content) : { preamble: "", sections: [] }),
    [content]
  );

  if (error) return <ErrorState error={error} />;

  if (quizContent) {
    return (
      <ScrollArea className="h-full">
        <div className="mx-auto max-w-4xl px-4 py-4 md:px-8 md:py-6">{quizContent}</div>
      </ScrollArea>
    );
  }

  if (isLoading && !content) {
    return <ContentSkeleton />;
  }

  if (!content) return <ReadyState />;

  return (
    <ScrollArea className="h-full">
      {onTextSelectionAction && (
        <TextSelectionToolbar
          articleRef={articleRef}
          onAction={(action, text) => onTextSelectionAction(action, text)}
        />
      )}
      <article ref={articleRef} className="mx-auto max-w-4xl px-4 pb-20 pt-4 md:px-8 md:pt-6">
        {/* Audio progress bar */}
        {audioPlayer && (audioPlayer.isPlaying || audioPlayer.duration > 0) && (
          <AudioProgressBar
            isPlaying={audioPlayer.isPlaying}
            isLoading={audioPlayer.isLoading}
            hasAudio={audioPlayer.hasAudio}
            progress={audioPlayer.progress}
            currentTime={audioPlayer.currentTime}
            duration={audioPlayer.duration}
            onToggle={audioPlayer.toggle}
          />
        )}

        {/* Subtopic header */}
        {activeModuleTitle && activeSubtopicTitle && subtopicPosition && (
          <div className="mb-8">
            <div className="flex flex-wrap items-center justify-between gap-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Module {activeModuleId} <span className="mx-1 text-border">/</span> Subtopic {subtopicPosition.current} of {subtopicPosition.total}
              </p>
              <div className="flex items-center gap-2">
                {hasPreviousVersion && onRollback && !isLoading && (
                  <button
                    onClick={onRollback}
                    className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-all hover:border-amber-500/30 hover:text-amber-600"
                  >
                    <Undo2 className="size-3" />
                    Undo
                  </button>
                )}
                {onRegenerate && !isLoading && (
                  <button
                    onClick={() => setShowFeedback((prev) => !prev)}
                    className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-all hover:border-primary/30 hover:text-primary"
                  >
                    <RefreshCw className="size-3" />
                    Regenerate
                  </button>
                )}
                {audioPlayer && (
                  <AudioPlayButton
                    isPlaying={audioPlayer.isPlaying}
                    isLoading={audioPlayer.isLoading}
                    onToggle={audioPlayer.toggle}
                  />
                )}
              </div>
            </div>
            <h1 className="mt-3 font-serif text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {activeSubtopicTitle}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {activeModuleTitle}
            </p>
            <div className="mt-4 h-px bg-border" />

            {/* Regenerate feedback */}
            {showFeedback && onRegenerate && (
              <div className="mt-4 space-y-2">
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="What should be different? (optional)"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20"
                  rows={2}
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onRegenerate(feedbackText || undefined);
                      setShowFeedback(false);
                      setFeedbackText("");
                    }}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Regenerate content
                  </button>
                  <button
                    onClick={() => {
                      setShowFeedback(false);
                      setFeedbackText("");
                    }}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Learning recommendations */}
        {topicId && <LearningRecommendations topicId={topicId} onCurriculumChange={onCurriculumChange} />}

        {/* Backtracking hint */}
        {isBacktracking && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm text-muted-foreground">
            <ChevronLeft className="size-4 shrink-0 text-primary" />
            <span>Revisiting earlier material — use the chat to ask about anything that needs clarification.</span>
            <button
              onClick={() => setIsBacktracking(false)}
              className="ml-auto shrink-0 text-xs text-muted-foreground/60 hover:text-foreground"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Preamble — only render if no subtopic header (fallback for content without sections) */}
        {preamble && !activeSubtopicTitle && <MemoizedSectionBody markdown={preamble} />}

        {/* Section-based rendering */}
        {sections.map((section) => (
          <div
            key={section.index}
            className={cn(
              "transition-all duration-500",
              activeSectionIndex === section.index &&
                "rounded-r-lg border-l-2 border-primary bg-primary/5 -ml-4 pl-4"
            )}
          >
            <h3 className="mb-3 mt-6 text-base font-semibold text-primary">
              {section.index + 1}. {section.title}
            </h3>
            <MemoizedSectionBody markdown={section.body} />
          </div>
        ))}

        {/* Fallback: render as single block if no sections detected */}
        {sections.length === 0 && content && <MemoizedSectionBody markdown={content} />}

        {/* Prev / Next navigation */}
        {onNavigateSubtopic && (
          <SubtopicNavBar prev={prev} next={next} onNavigate={onNavigateSubtopic} />
        )}
      </article>
    </ScrollArea>
  );
}
