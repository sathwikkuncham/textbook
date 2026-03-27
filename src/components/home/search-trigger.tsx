"use client";

import { Search } from "lucide-react";
import { useCommandPalette } from "@/hooks/use-command-palette";

export function SearchTrigger() {
  const { setOpen } = useCommandPalette();

  return (
    <button
      onClick={() => setOpen(true)}
      className="flex h-9 w-full items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 text-sm text-muted-foreground transition-colors hover:border-border hover:bg-muted sm:w-56"
    >
      <Search className="size-4 shrink-0" />
      <span className="flex-1 text-left">Search...</span>
      <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
        Ctrl K
      </kbd>
    </button>
  );
}
