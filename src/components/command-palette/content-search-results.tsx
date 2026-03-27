"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { FileText, Loader2, Search } from "lucide-react";
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
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Searching content...
      </div>
    );
  }

  if (query.length < 3) {
    return (
      <div className="flex flex-col items-center gap-2 py-8">
        <FileText className="size-5 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">
          Type at least 3 characters to search lesson content
        </p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8">
        <Search className="size-5 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No content matches found</p>
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
            router.push(`/learn/${result.topicSlug}?m=${result.moduleId}&s=${result.subtopicId}`);
            setOpen(false);
          }}
          className="group flex cursor-pointer items-start gap-3 rounded-lg px-3 py-3 transition-colors aria-selected:bg-primary/5"
        >
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/50 text-muted-foreground transition-colors group-aria-selected:bg-primary/10 group-aria-selected:text-primary">
            <FileText className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="mb-0.5 block text-[11px] font-medium text-muted-foreground">
              {result.topicName} &rsaquo; {result.moduleTitle} &rsaquo;{" "}
              {result.subtopicTitle}
            </span>
            <span className="block text-sm leading-relaxed text-foreground/70 group-aria-selected:text-foreground/90">
              {result.snippet}
            </span>
          </div>
        </Command.Item>
      ))}
    </>
  );
}
