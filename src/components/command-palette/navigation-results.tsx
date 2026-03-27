"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { BookOpen, Loader2 } from "lucide-react";
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
        <div className="flex items-center justify-center py-6">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      </Command.Loading>
    );
  }

  // Group items by topic
  const grouped = new Map<string, NavigationItem[]>();
  for (const item of items) {
    const key = item.topicName;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(item);
  }

  return (
    <>
      {Array.from(grouped.entries()).map(([topicName, topicItems]) => (
        <Command.Group key={topicName} heading={topicName}>
          {topicItems.map((item) => (
            <Command.Item
              key={`${item.topicSlug}-${item.subtopicId}`}
              value={`${item.topicName} ${item.moduleTitle} ${item.subtopicTitle} ${item.keyConcepts.join(" ")}`}
              onSelect={() => {
                router.push(`/learn/${item.topicSlug}`);
                setOpen(false);
              }}
              className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm aria-selected:bg-accent"
            >
              <BookOpen className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <span className="block truncate text-foreground">
                  {item.subtopicTitle}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {item.moduleTitle}
                </span>
              </div>
            </Command.Item>
          ))}
        </Command.Group>
      ))}
      <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
        No results found.
      </Command.Empty>
    </>
  );
}
