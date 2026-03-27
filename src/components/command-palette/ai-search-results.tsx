"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, ArrowRight, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useCommandPalette } from "@/hooks/use-command-palette";

interface NavigateTarget {
  topicSlug: string;
  moduleId: number;
  subtopicId: string;
  breadcrumb: string;
}

interface AISearchResultsProps {
  query: string;
}

export function AISearchResults({ query }: AISearchResultsProps) {
  const router = useRouter();
  const { setOpen } = useCommandPalette();
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [navigateTarget, setNavigateTarget] = useState<NavigateTarget | null>(null);

  const handleSearch = useCallback(async () => {
    if (!query.trim() || loading) return;

    setLoading(true);
    setResponse("");
    setNavigateTarget(null);

    try {
      const res = await fetch("/api/learn/search/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.text) {
              fullText += data.text;
              setResponse(fullText);
            }
            if (data.done) {
              const navMatch = fullText.match(
                /NAVIGATE:\s*([^|]+)\|(\d+)\|([^|]+)\|(.+)/
              );
              if (navMatch) {
                setNavigateTarget({
                  topicSlug: navMatch[1].trim(),
                  moduleId: parseInt(navMatch[2]),
                  subtopicId: navMatch[3].trim(),
                  breadcrumb: navMatch[4].trim(),
                });
                setResponse(fullText.replace(/NAVIGATE:.*$/m, "").trim());
              }
            }
          } catch {
            // Skip malformed chunks
          }
        }
      }
    } catch {
      setResponse("Failed to search. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [query, loading]);

  if (!response && !loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/5">
          <Sparkles className="size-6 text-primary/60" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            Ask anything about your learning content
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            AI will search across all your topics and provide an answer
          </p>
        </div>
        <button
          onClick={handleSearch}
          disabled={!query.trim()}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <Send className="size-3.5" />
          Search with AI
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3">
      {loading && !response && (
        <div className="flex items-center gap-2.5 rounded-lg bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          Searching across your knowledge base...
        </div>
      )}

      {response && (
        <div className="rounded-lg border border-border/50 bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="size-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">AI Answer</span>
          </div>
          <div className="prose-sm max-h-52 overflow-y-auto text-sm leading-relaxed text-foreground/90">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                strong: ({ children }) => (
                  <strong className="font-semibold text-foreground">{children}</strong>
                ),
                ul: ({ children }) => (
                  <ul className="mb-2 ml-4 list-disc">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-2 ml-4 list-decimal">{children}</ol>
                ),
              }}
            >
              {response}
            </ReactMarkdown>
            {loading && (
              <span className="inline-block h-4 w-0.5 animate-pulse rounded-full bg-primary" />
            )}
          </div>
        </div>
      )}

      {navigateTarget && (
        <button
          onClick={() => {
            router.push(`/learn/${navigateTarget.topicSlug}`);
            setOpen(false);
          }}
          className="flex w-full items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm transition-colors hover:bg-primary/10"
        >
          <div className="flex size-7 items-center justify-center rounded-md bg-primary/10">
            <ArrowRight className="size-3.5 text-primary" />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <span className="block text-[11px] text-muted-foreground">Continue learning</span>
            <span className="block truncate font-medium text-primary">
              {navigateTarget.breadcrumb}
            </span>
          </div>
        </button>
      )}
    </div>
  );
}
