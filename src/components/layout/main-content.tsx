"use client";

import { useRef } from "react";
import { BookOpen, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MermaidDiagram } from "@/components/ui/mermaid-diagram";
import { TextSelectionToolbar } from "@/components/chat/text-selection-toolbar";
import type { LearningPhase } from "@/hooks/use-learning-state";

interface MainContentProps {
  phase: LearningPhase;
  content: string | null;
  isLoading: boolean;
  error: string | null;
  activeModuleTitle?: string;
  onTextSelectionAction?: (action: string, selectedText: string) => void;
  quizContent?: React.ReactNode;
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <Loader2 className="size-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
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

const PHASE_MESSAGES: Record<string, string> = {
  researching: "Researching topic with parallel agents...",
  designing: "Designing curriculum from research...",
  assessing: "Generating assessment...",
};

export function MainContent({
  phase,
  content,
  isLoading,
  error,
  activeModuleTitle,
  onTextSelectionAction,
  quizContent,
}: MainContentProps) {
  const articleRef = useRef<HTMLElement>(null);

  if (error) return <ErrorState error={error} />;

  if (quizContent) {
    return (
      <ScrollArea className="h-full">
        <div className="mx-auto max-w-3xl px-4 py-4 md:px-8 md:py-6">{quizContent}</div>
      </ScrollArea>
    );
  }

  if (isLoading && !content) {
    const message =
      PHASE_MESSAGES[phase] ?? `Loading ${activeModuleTitle ?? "content"}...`;
    return <LoadingState message={message} />;
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
      <article ref={articleRef} className="mx-auto max-w-3xl px-4 py-4 md:px-8 md:py-6">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="mb-6 border-b border-border pb-3 font-serif text-xl font-bold text-foreground md:text-2xl">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="mb-4 mt-10 border-b border-border/50 pb-2 font-serif text-lg font-semibold text-foreground md:text-xl">
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
              <p className="mb-4 leading-7 text-foreground/90">{children}</p>
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
      </article>
    </ScrollArea>
  );
}
