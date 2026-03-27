"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, ArrowRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
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
  const [navigateTarget, setNavigateTarget] = useState<NavigateTarget | null>(
    null
  );

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
              // Parse NAVIGATE line from response
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
                // Remove the NAVIGATE line from displayed response
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
      <div className="flex flex-col items-center gap-3 py-6">
        <Sparkles className="size-6 text-primary/50" />
        <p className="text-center text-sm text-muted-foreground">
          Ask any question about your learning content
        </p>
        <Button
          size="sm"
          onClick={handleSearch}
          disabled={!query.trim()}
          className="gap-1.5"
        >
          <Sparkles className="size-3.5" />
          Search with AI
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-3 py-3">
      {loading && !response && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Thinking...
        </div>
      )}

      {response && (
        <div className="prose-sm max-h-64 overflow-y-auto text-sm text-foreground">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              strong: ({ children }) => (
                <strong className="font-semibold">{children}</strong>
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
            <span className="inline-block h-4 w-1 animate-pulse bg-primary" />
          )}
        </div>
      )}

      {navigateTarget && (
        <button
          onClick={() => {
            router.push(`/learn/${navigateTarget.topicSlug}`);
            setOpen(false);
          }}
          className="flex w-full items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary transition-colors hover:bg-primary/10"
        >
          <ArrowRight className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-left">
            Go to: {navigateTarget.breadcrumb}
          </span>
        </button>
      )}
    </div>
  );
}
