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
              <span className="line-clamp-1 text-[11px] font-semibold tracking-wide text-muted-foreground/70">
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
