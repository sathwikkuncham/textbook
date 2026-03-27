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
  const [aiTrigger, setAiTrigger] = useState(false);
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
    if (e.key === "Enter" && mode === "ai") {
      e.preventDefault();
      setAiTrigger((prev) => !prev);
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
          filter={(value, search) => {
            const v = value.toLowerCase();
            const s = search.toLowerCase();
            // Word-boundary match (e.g. "git" matches "Git Version Control") → high score
            const words = v.split(/\s+/);
            if (words.some((w) => w.startsWith(s))) return 1;
            // Substring match (e.g. "git" inside "Registry") → low score
            if (v.includes(s)) return 0.3;
            return 0;
          }}
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
            {mode === "ai" && <AISearchResults query={query} triggerSearch={aiTrigger} />}
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
