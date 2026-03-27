"use client";

import { Search, X } from "lucide-react";
import { useCommandPalette } from "@/hooks/use-command-palette";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TopicCard } from "./topic-card";
import {
  useTopicFilters,
  type SortKey,
  type FilterCategory,
} from "@/hooks/use-topic-filters";
import { cn } from "@/lib/utils";

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
  category?: string;
}

interface TopicListShellProps {
  topics: TopicItem[];
}

const CATEGORY_CHIPS = [
  { value: "programming", label: "Programming" },
  { value: "systems", label: "Systems" },
  { value: "data-science", label: "Data Science" },
  { value: "web-dev", label: "Web Dev" },
  { value: "devops", label: "DevOps" },
  { value: "theory", label: "Theory" },
  { value: "math", label: "Math" },
  { value: "design", label: "Design" },
];

const LEVEL_CHIPS = [
  { value: "beginner", label: "Beginner", class: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
  { value: "intermediate", label: "Intermediate", class: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "advanced", label: "Advanced", class: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
];

const SOURCE_CHIPS = [
  { value: "topic_only", label: "Topic" },
  { value: "pdf", label: "PDF" },
  { value: "url", label: "URL" },
];

const STATUS_CHIPS = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

export function TopicListShell({ topics }: TopicListShellProps) {
  const {
    filteredTopics,
    searchQuery,
    setSearchQuery,
    sortKey,
    setSortKey,
    filters,
    toggleFilter,
    clearFilters,
    activeFilterCount,
  } = useTopicFilters(topics);
  const { setOpen: openPalette } = useCommandPalette();

  return (
    <section>
      {/* Search + Sort row */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search topics..."
            className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-20 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:pr-24"
          />
          <button
            onClick={() => openPalette(true)}
            className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-md border border-border bg-muted/80 px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Search className="size-3" />
            <span className="hidden sm:inline">Ctrl K</span>
            <span className="sm:hidden">Search</span>
          </button>
        </div>
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="h-10 w-full text-sm sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lastSession">Last Accessed</SelectItem>
            <SelectItem value="alphabetical">A — Z</SelectItem>
            <SelectItem value="progress">Progress</SelectItem>
            <SelectItem value="modules">Modules</SelectItem>
            <SelectItem value="time">Est. Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Filter chips */}
      <div className="scrollbar-none mb-4 flex items-center gap-2 overflow-x-auto pb-1">
        <span className="shrink-0 text-xs text-muted-foreground">Filter:</span>

        {LEVEL_CHIPS.map((chip) => (
          <button
            key={chip.value}
            onClick={() => toggleFilter("level" as FilterCategory, chip.value)}
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              filters.level.has(chip.value)
                ? cn(chip.class, "border-transparent")
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {chip.label}
          </button>
        ))}

        <span className="text-border">|</span>

        {SOURCE_CHIPS.map((chip) => (
          <button
            key={chip.value}
            onClick={() => toggleFilter("sourceType" as FilterCategory, chip.value)}
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              filters.sourceType.has(chip.value)
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {chip.label}
          </button>
        ))}

        <span className="text-border">|</span>

        {STATUS_CHIPS.map((chip) => (
          <button
            key={chip.value}
            onClick={() => toggleFilter("status" as FilterCategory, chip.value)}
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              filters.status.has(chip.value)
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {chip.label}
          </button>
        ))}

        <span className="text-border">|</span>

        {CATEGORY_CHIPS.map((chip) => (
          <button
            key={chip.value}
            onClick={() => toggleFilter("category" as FilterCategory, chip.value)}
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              filters.category.has(chip.value)
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {chip.label}
          </button>
        ))}

        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="ml-1 flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" />
            Clear
          </button>
        )}
      </div>

      {/* Results count */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-foreground">
          Your Topics
        </h2>
        <span className="text-sm text-muted-foreground">
          {filteredTopics.length === topics.length
            ? `${topics.length} topic${topics.length !== 1 ? "s" : ""}`
            : `${filteredTopics.length} of ${topics.length}`}
        </span>
      </div>

      {/* Topic grid */}
      {filteredTopics.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTopics.map((t) => (
            <TopicCard
              key={t.slug}
              slug={t.slug}
              displayName={t.displayName}
              level={t.level}
              goal={t.goal}
              totalModules={t.totalModules}
              estimatedMinutes={t.estimatedMinutes}
              completionPercent={t.completionPercent}
              lastSession={t.lastSession}
              sourceType={t.sourceType}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16">
          <Search className="mb-3 size-10 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground">
            No topics match your filters
          </p>
          <button
            onClick={clearFilters}
            className="mt-2 text-sm text-primary hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </section>
  );
}
