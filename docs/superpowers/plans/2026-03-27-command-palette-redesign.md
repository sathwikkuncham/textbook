# Command Palette Visual Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the command palette from a debug-panel prototype into a polished, Raycast-quality experience with proper backdrop, elevation, visual hierarchy, and interaction design.

**Architecture:** Pure visual rewrite of 4 existing components — no data flow, API, or logic changes. The command palette bypasses the shadcn Dialog component entirely (its overlay is too faint, positioning is wrong) and renders its own portal with a custom backdrop and modal. All cmdk functionality stays intact.

**Tech Stack:** cmdk, Tailwind CSS v4, Lucide icons, React portals, existing design tokens from globals.css

---

### Task 1: Rewrite command-palette.tsx — Modal shell with custom backdrop

**Files:**
- Modify: `src/components/command-palette/command-palette.tsx`

The current implementation uses shadcn's `DialogContent` which applies `bg-black/10` overlay — nearly invisible. The modal has no shadow, no elevation, wrong positioning. We bypass Dialog entirely and build our own portal with a proper backdrop.

- [ ] **Step 1: Rewrite the complete component**

```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Command } from "cmdk";
import { Search, Compass, FileSearch, Sparkles } from "lucide-react";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { NavigationResults } from "./navigation-results";
import { ContentSearchResults } from "./content-search-results";
import { AISearchResults } from "./ai-search-results";
import { cn } from "@/lib/utils";

type SearchMode = "navigate" | "content" | "ai";

const MODES: Array<{
  id: SearchMode;
  label: string;
  icon: React.ElementType;
  hint: string;
}> = [
  { id: "navigate", label: "Navigate", icon: Compass, hint: "Jump to any subtopic..." },
  { id: "content", label: "Search Content", icon: FileSearch, hint: "Search inside lessons..." },
  { id: "ai", label: "Ask AI", icon: Sparkles, hint: "Ask anything about your topics..." },
];

export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const [mode, setMode] = useState<SearchMode>("navigate");
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setMode("navigate");
      setQuery("");
    }
  }, [open]);

  useEffect(() => {
    if (query.startsWith(">") && mode !== "content") {
      setMode("content");
      setQuery(query.slice(1).trimStart());
    }
  }, [query, mode]);

  // Auto-focus input on open
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const currentIndex = MODES.findIndex((m) => m.id === mode);
      const next = MODES[(currentIndex + 1) % MODES.length];
      setMode(next.id);
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  };

  if (!open) return null;

  const currentMode = MODES.find((m) => m.id === mode)!;

  return createPortal(
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-150"
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div className="relative mx-auto mt-[12vh] w-full max-w-xl px-4 animate-in fade-in-0 slide-in-from-top-4 duration-200 md:mt-[20vh] md:px-0">
        <Command
          shouldFilter={mode === "navigate"}
          onKeyDown={handleKeyDown}
          className="overflow-hidden rounded-xl border border-border/50 bg-popover shadow-2xl ring-1 ring-black/5 dark:ring-white/5"
        >
          {/* Search input area */}
          <div className="flex items-center gap-3 border-b border-border/50 px-4">
            <Search className="size-5 shrink-0 text-muted-foreground/60" />
            <Command.Input
              ref={inputRef}
              value={query}
              onValueChange={setQuery}
              placeholder={currentMode.hint}
              className="h-12 w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground/50 focus:outline-none md:h-14 md:text-base"
            />
            <div className="hidden items-center gap-1.5 sm:flex">
              <kbd className="rounded-md border border-border bg-muted/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                Tab
              </kbd>
              <span className="text-[10px] text-muted-foreground/50">mode</span>
            </div>
          </div>

          {/* Mode selector */}
          <div className="flex gap-1 border-b border-border/30 bg-muted/30 px-3 py-1.5">
            {MODES.map((m) => {
              const Icon = m.icon;
              const isActive = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
                    isActive
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn("size-3.5", isActive && "text-primary")} />
                  <span className="hidden sm:inline">{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Results */}
          <Command.List className="max-h-[min(50vh,24rem)] overflow-y-auto overscroll-contain px-2 py-2">
            {mode === "navigate" && <NavigationResults />}
            {mode === "content" && <ContentSearchResults query={query} />}
            {mode === "ai" && <AISearchResults query={query} />}
          </Command.List>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border/30 bg-muted/20 px-4 py-2">
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60">
              <span><kbd className="font-mono">↑↓</kbd> navigate</span>
              <span><kbd className="font-mono">↵</kbd> select</span>
              <span><kbd className="font-mono">esc</kbd> close</span>
            </div>
            <span className="text-[10px] text-muted-foreground/40">
              Ctrl+K
            </span>
          </div>
        </Command>
      </div>
    </div>,
    document.body
  );
}
```

- [ ] **Step 2: Verify build compiles**

Run: `npx next build 2>&1 | head -8`
Expected: `Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add src/components/command-palette/command-palette.tsx
git commit -m "redesign: command palette shell — custom backdrop, elevation, visual polish"
```

---

### Task 2: Rewrite navigation-results.tsx — Visual hierarchy and item design

**Files:**
- Modify: `src/components/command-palette/navigation-results.tsx`

Current items are flat and monotonous. New design: topic groups with subtle headers, items with icon tint per topic, hover state with left border accent, better breadcrumb typography.

- [ ] **Step 1: Rewrite the complete component**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { BookOpen, ChevronRight, Loader2, Search } from "lucide-react";
import { useCommandPalette } from "@/hooks/use-command-palette";

interface NavigationItem {
  topicSlug: string;
  topicName: string;
  moduleId: number;
  moduleTitle: string;
  subtopicId: string;
  subtopicTitle: string;
  keyConcepts: string[];
}

export function NavigationResults() {
  const router = useRouter();
  const { setOpen } = useCommandPalette();
  const [items, setItems] = useState<NavigationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/learn/search/navigation")
      .then((res) => res.json())
      .then((data) => {
        setItems(data.items ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Command.Loading>
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading topics...
        </div>
      </Command.Loading>
    );
  }

  const grouped = new Map<string, NavigationItem[]>();
  for (const item of items) {
    if (!grouped.has(item.topicName)) grouped.set(item.topicName, []);
    grouped.get(item.topicName)!.push(item);
  }

  return (
    <>
      {Array.from(grouped.entries()).map(([topicName, topicItems]) => (
        <Command.Group
          key={topicName}
          heading={
            <div className="flex items-center gap-2 px-2 py-1.5">
              <BookOpen className="size-3 text-primary/60" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {topicName}
              </span>
            </div>
          }
        >
          {topicItems.map((item) => (
            <Command.Item
              key={`${item.topicSlug}-${item.subtopicId}`}
              value={`${item.topicName} ${item.moduleTitle} ${item.subtopicTitle} ${item.keyConcepts.join(" ")}`}
              onSelect={() => {
                router.push(`/learn/${item.topicSlug}`);
                setOpen(false);
              }}
              className="group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors aria-selected:bg-primary/5 aria-selected:text-foreground"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/50 text-muted-foreground transition-colors group-aria-selected:bg-primary/10 group-aria-selected:text-primary">
                <BookOpen className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block truncate font-medium text-foreground">
                  {item.subtopicTitle}
                </span>
                <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                  {item.moduleTitle}
                  <ChevronRight className="size-3 text-muted-foreground/40" />
                  <span className="text-muted-foreground/60">{item.subtopicId}</span>
                </span>
              </div>
            </Command.Item>
          ))}
        </Command.Group>
      ))}
      <Command.Empty>
        <div className="flex flex-col items-center gap-2 py-8">
          <Search className="size-5 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No results found</p>
        </div>
      </Command.Empty>
    </>
  );
}
```

- [ ] **Step 2: Verify build compiles**

Run: `npx next build 2>&1 | head -8`
Expected: `Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add src/components/command-palette/navigation-results.tsx
git commit -m "redesign: navigation results — icon boxes, group headers, selected state"
```

---

### Task 3: Rewrite content-search-results.tsx — Snippet cards with breadcrumbs

**Files:**
- Modify: `src/components/command-palette/content-search-results.tsx`

- [ ] **Step 1: Rewrite the complete component**

```tsx
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
            router.push(`/learn/${result.topicSlug}`);
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
```

- [ ] **Step 2: Verify build compiles**

Run: `npx next build 2>&1 | head -8`
Expected: `Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add src/components/command-palette/content-search-results.tsx
git commit -m "redesign: content search results — icon boxes, breadcrumbs, snippet cards"
```

---

### Task 4: Rewrite ai-search-results.tsx — Polished AI interaction

**Files:**
- Modify: `src/components/command-palette/ai-search-results.tsx`

- [ ] **Step 1: Rewrite the complete component**

```tsx
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
```

- [ ] **Step 2: Verify build compiles**

Run: `npx next build 2>&1 | head -8`
Expected: `Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add src/components/command-palette/ai-search-results.tsx
git commit -m "redesign: AI search — polished CTA, answer card, navigation link"
```

---

### Task 5: Final build verification and deploy

**Files:** None new — verify and push.

- [ ] **Step 1: Full build verification**

Run: `npx next build 2>&1 | tail -20`
Expected: All routes compile, no errors.

- [ ] **Step 2: Commit all and push**

```bash
git push
```

- [ ] **Step 3: Deploy to Vercel**

```bash
vercel --prod
```
