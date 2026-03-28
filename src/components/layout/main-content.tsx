"use client";

import { useRef, useMemo } from "react";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MermaidDiagram } from "@/components/ui/mermaid-diagram";
import { TextSelectionToolbar } from "@/components/chat/text-selection-toolbar";
import type { LearningPhase } from "@/hooks/use-learning-state";
import type { Curriculum } from "@/lib/types/learning";

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
}

function ContentSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-4 md:px-8 md:py-6">
      {/* Heading */}
      <div className="mb-6 border-b border-border pb-3">
        <div className="h-7 w-1/2 animate-pulse rounded bg-muted" />
      </div>
      {/* Paragraph block */}
      <div className="space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
      </div>
      {/* Subheading */}
      <div className="mb-3 mt-10 h-6 w-2/5 animate-pulse rounded bg-muted" />
      {/* More paragraphs */}
      <div className="space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-10/12 animate-pulse rounded bg-muted" />
        <div className="h-4 w-9/12 animate-pulse rounded bg-muted" />
      </div>
      {/* Code block */}
      <div className="mt-4 h-32 w-full animate-pulse rounded-lg border border-border bg-muted/50" />
      {/* Another heading */}
      <div className="mb-3 mt-8 h-5 w-1/3 animate-pulse rounded bg-muted" />
      {/* Final paragraphs */}
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

    // Flatten all subtopics across all modules
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

    const currentLabel = currentIdx >= 0
      ? `${flat[currentIdx].moduleTitle}`
      : null;

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
}: MainContentProps) {
  const articleRef = useRef<HTMLElement>(null);
  const { prev, next } = useSubtopicNav(curriculum, activeModuleId, activeSubtopicId);

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
      <article ref={articleRef} className="mx-auto max-w-4xl px-4 py-4 md:px-8 md:py-6">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="mb-6 border-b border-border pb-3 font-serif text-xl font-bold tracking-tight text-foreground md:text-2xl">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="mb-4 mt-10 border-b border-border/50 pb-2 font-serif text-lg font-semibold tracking-tight text-foreground md:text-xl">
                {children}
              </h2>
            ),
            h3: ({ children }) => {
              const text = String(children);
              const isSectionHeader =
                /^\d+\.\s/.test(text) ||
                [
                  "Why This Matters",
                  "Core Idea",
                  "Visualizing It",
                  "Real-World Analogy",
                  "Concrete Example",
                  "Common Pitfalls",
                  "Key Takeaway",
                ].some((s) => text.includes(s));

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
            p: ({ children }) => (
              <p className="mb-4 leading-relaxed text-foreground/90">{children}</p>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold text-foreground">
                {children}
              </strong>
            ),
            ul: ({ children }) => (
              <ul className="mb-4 ml-6 list-disc space-y-1 text-foreground/90">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="mb-4 ml-6 list-decimal space-y-1 text-foreground/90">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="leading-7">{children}</li>
            ),
            blockquote: ({ children }) => (
              <blockquote className="mb-4 border-l-4 border-primary/30 pl-4 italic text-muted-foreground">
                {children}
              </blockquote>
            ),
            code: ({ className, children }) => {
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
            pre: ({ children }) => {
              const child = children as React.ReactElement<{ className?: string }>;
              if (
                child?.props?.className?.includes("language-mermaid")
              ) {
                return <>{children}</>;
              }
              return (
                <pre className="mb-4 overflow-x-auto rounded-lg border border-border bg-muted/50 p-4 font-mono text-[13px] leading-[1.45]">
                  {children}
                </pre>
              );
            },
            table: ({ children }) => (
              <div className="mb-4 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="border-b border-border bg-muted/50">
                {children}
              </thead>
            ),
            th: ({ children }) => (
              <th className="px-3 py-2 text-left font-semibold text-foreground">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border-b border-border/30 px-3 py-2 text-foreground/90">
                {children}
              </td>
            ),
            hr: () => <hr className="my-8 border-border" />,
          }}
        >
          {content}
        </ReactMarkdown>

        {/* Prev / Next navigation */}
        {onNavigateSubtopic && (
          <SubtopicNavBar
            prev={prev}
            next={next}
            onNavigate={onNavigateSubtopic}
          />
        )}
      </article>
    </ScrollArea>
  );
}
