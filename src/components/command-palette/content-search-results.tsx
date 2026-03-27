"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { FileText, Loader2 } from "lucide-react";
import { useCommandPalette } from "@/hooks/use-command-palette";

interface ContentResult {
  topicSlug: string;
  topicName: string;
  moduleId: number;
  moduleTitle: string;
  subtopicId: string;
  subtopicTitle: string;
  snippet: string;
}

interface ContentSearchResultsProps {
  query: string;
}

export function ContentSearchResults({ query }: ContentSearchResultsProps) {
  const router = useRouter();
  const { setOpen } = useCommandPalette();
  const [results, setResults] = useState<ContentResult[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      fetch(`/api/learn/search/content?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data) => {
          setResults(data.results ?? []);
          setLoading(false);
        })
        .catch((err) => {
          if (err.name !== "AbortError") setLoading(false);
        });
    }, 300);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [query]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (query.length < 3) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        Type at least 3 characters to search content...
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        No content matches found.
      </div>
    );
  }

  return (
    <>
      {results.map((result, i) => (
        <Command.Item
          key={`${result.topicSlug}-${result.subtopicId}-${i}`}
          value={`${result.topicName} ${result.moduleTitle} ${result.subtopicTitle} ${result.snippet}`}
          onSelect={() => {
            router.push(`/learn/${result.topicSlug}`);
            setOpen(false);
          }}
          className="flex cursor-pointer items-start gap-3 rounded-md px-3 py-2.5 text-sm aria-selected:bg-accent"
        >
          <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <span className="block text-xs text-muted-foreground">
              {result.topicName} &rsaquo; {result.moduleTitle} &rsaquo;{" "}
              {result.subtopicTitle}
            </span>
            <span className="mt-0.5 block text-sm leading-relaxed text-foreground/80">
              {result.snippet}
            </span>
          </div>
        </Command.Item>
      ))}
    </>
  );
}
