"use client";

import { useState, useEffect } from "react";
import { Command } from "cmdk";
import { Compass, FileSearch, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { NavigationResults } from "./navigation-results";
import { ContentSearchResults } from "./content-search-results";
import { AISearchResults } from "./ai-search-results";
import { cn } from "@/lib/utils";

type SearchMode = "navigate" | "content" | "ai";

const MODES: Array<{ id: SearchMode; label: string; icon: React.ElementType; hint: string }> = [
  { id: "navigate", label: "Navigate", icon: Compass, hint: "Jump to any subtopic" },
  { id: "content", label: "Content", icon: FileSearch, hint: "Search inside lessons" },
  { id: "ai", label: "Ask AI", icon: Sparkles, hint: "Natural language search" },
];

export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const [mode, setMode] = useState<SearchMode>("navigate");
  const [query, setQuery] = useState("");

  // Reset state when palette closes
  useEffect(() => {
    if (!open) {
      setMode("navigate");
      setQuery("");
    }
  }, [open]);

  // Auto-switch mode on ">" prefix
  useEffect(() => {
    if (query.startsWith(">") && mode !== "content") {
      setMode("content");
      setQuery(query.slice(1).trimStart());
    }
  }, [query, mode]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const currentIndex = MODES.findIndex((m) => m.id === mode);
      const next = MODES[(currentIndex + 1) % MODES.length];
      setMode(next.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="top-[20%] translate-y-0 p-0 sm:max-w-xl [&>button]:hidden"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Search</DialogTitle>
        <Command
          shouldFilter={mode === "navigate"}
          className="flex flex-col"
          onKeyDown={handleKeyDown}
        >
          {/* Mode tabs */}
          <div className="flex border-b border-border">
            {MODES.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors",
                    mode === m.id
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="size-3.5" />
                  <span className="hidden sm:inline">{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search input */}
          <div className="flex items-center border-b border-border px-3">
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder={MODES.find((m) => m.id === mode)?.hint ?? "Search..."}
              className="h-11 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <kbd className="hidden shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline-block">
              Tab
            </kbd>
          </div>

          {/* Results */}
          <Command.List className="max-h-80 overflow-y-auto p-2">
            {mode === "navigate" && <NavigationResults />}
            {mode === "content" && <ContentSearchResults query={query} />}
            {mode === "ai" && <AISearchResults query={query} />}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
