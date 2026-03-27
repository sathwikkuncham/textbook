import { useState, useMemo, useCallback } from "react";

export type SortKey = "lastSession" | "alphabetical" | "progress" | "modules" | "time";
export type FilterCategory = "level" | "sourceType" | "status";

interface TopicItem {
  slug: string;
  displayName: string;
  level: string;
  goal: string;
  totalModules: number;
  estimatedMinutes: number;
  completionPercent: number;
  lastSession: string;
  sourceType?: string;
}

interface Filters {
  level: Set<string>;
  sourceType: Set<string>;
  status: Set<string>;
}

function getStatus(completionPercent: number): string {
  if (completionPercent === 0) return "not_started";
  if (completionPercent >= 100) return "completed";
  return "in_progress";
}

export function useTopicFilters(topics: TopicItem[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("lastSession");
  const [filters, setFilters] = useState<Filters>({
    level: new Set(),
    sourceType: new Set(),
    status: new Set(),
  });

  const toggleFilter = useCallback((category: FilterCategory, value: string) => {
    setFilters((prev) => {
      const next = { ...prev, [category]: new Set(prev[category]) };
      if (next[category].has(value)) {
        next[category].delete(value);
      } else {
        next[category].add(value);
      }
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ level: new Set(), sourceType: new Set(), status: new Set() });
    setSearchQuery("");
  }, []);

  const activeFilterCount =
    filters.level.size + filters.sourceType.size + filters.status.size;

  const filteredTopics = useMemo(() => {
    let result = topics;

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.displayName.toLowerCase().includes(q) ||
          t.goal.toLowerCase().includes(q)
      );
    }

    // Filter: level
    if (filters.level.size > 0) {
      result = result.filter((t) => filters.level.has(t.level));
    }

    // Filter: sourceType
    if (filters.sourceType.size > 0) {
      result = result.filter((t) =>
        filters.sourceType.has(t.sourceType ?? "topic_only")
      );
    }

    // Filter: status
    if (filters.status.size > 0) {
      result = result.filter((t) =>
        filters.status.has(getStatus(t.completionPercent))
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortKey) {
        case "lastSession":
          return new Date(b.lastSession).getTime() - new Date(a.lastSession).getTime();
        case "alphabetical":
          return a.displayName.localeCompare(b.displayName);
        case "progress":
          return b.completionPercent - a.completionPercent;
        case "modules":
          return b.totalModules - a.totalModules;
        case "time":
          return a.estimatedMinutes - b.estimatedMinutes;
        default:
          return 0;
      }
    });

    return result;
  }, [topics, searchQuery, sortKey, filters]);

  return {
    filteredTopics,
    searchQuery,
    setSearchQuery,
    sortKey,
    setSortKey,
    filters,
    toggleFilter,
    clearFilters,
    activeFilterCount,
  };
}
