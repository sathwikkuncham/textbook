"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  BookOpen,
  ArrowLeft,
  Play,
  Loader2,
  CheckSquare,
  Square,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScopeTree } from "@/components/scope-review/scope-tree";
import type {
  SourceToc,
  PageCalibration,
  UserScopeSelection,
} from "@/lib/types/learning";

export default function ScopeReviewPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [structure, setStructure] = useState<SourceToc | null>(null);
  const [calibration, setCalibration] = useState<PageCalibration | null>(null);
  const [scope, setScope] = useState<UserScopeSelection>({
    included: [],
    excluded: [],
    priorities: {},
  });
  const [topicInfo, setTopicInfo] = useState<{
    level: string;
    goal: string;
    timeCommitment: string;
  }>({ level: "intermediate", goal: "general understanding", timeCommitment: "standard" });
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStructure() {
      try {
        const res = await fetch("/api/learn/source/discover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: slug.replace(/-/g, " ") }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        setStructure(data.structure);
        setCalibration(data.calibration);

        if (data.userScope) {
          setScope(data.userScope);
        } else {
          const allIds = data.structure.chapters.map(
            (ch: { id: string }) => ch.id
          );
          const defaultPriorities: Record<string, "normal"> = {};
          allIds.forEach((id: string) => {
            defaultPriorities[id] = "normal";
          });
          setScope({
            included: allIds,
            excluded: [],
            priorities: defaultPriorities,
          });
        }

        // Fetch topic info (level, goal, timeCommitment)
        const topicRes = await fetch("/api/learn/topics");
        const topicData = await topicRes.json();
        const topic = topicData.topics?.find(
          (t: Record<string, unknown>) => t.slug === slug
        );
        if (topic) {
          setTopicInfo({
            level: topic.level ?? "intermediate",
            goal: topic.goal ?? "general understanding",
            timeCommitment: topic.timeCommitment ?? "standard",
          });

          // Fetch AI suggestion
          fetch("/api/learn/scope-suggest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              topic: slug.replace(/-/g, " "),
              level: topic.level,
              goal: topic.goal,
            }),
          })
            .then((r) => r.json())
            .then((d) => {
              if (d.recommendation) setAiSuggestion(d.recommendation);
            })
            .catch(() => {});
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load structure"
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadStructure();
  }, [slug]);

  const selectAll = () => {
    if (!structure) return;
    const allIds = structure.chapters.map((ch) => ch.id);
    const priorities: Record<string, "normal"> = {};
    allIds.forEach((id) => {
      priorities[id] = "normal";
    });
    setScope({ included: allIds, excluded: [], priorities });
  };

  const deselectAll = () => {
    if (!structure) return;
    const allIds = structure.chapters.map((ch) => ch.id);
    setScope({ included: [], excluded: allIds, priorities: {} });
  };

  const handleStartLearning = async () => {
    if (scope.included.length === 0) {
      setError("Select at least one chapter to study");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Save scope — use slug-derived name to match the DB record
      setPhase("Saving selection...");
      const topicName = slug.replace(/-/g, " ");

      await fetch("/api/learn/source/scope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topicName, scope }),
      });

      // Run research (supplementary)
      setPhase("Researching broader context...");
      await fetch("/api/learn/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topicName,
          level: topicInfo.level,
          goal: topicInfo.goal,
        }),
      });

      // Generate curriculum
      setPhase("Designing curriculum from your selections...");
      const currRes = await fetch("/api/learn/curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topicName,
          level: topicInfo.level,
          goal: topicInfo.goal,
          timeCommitment: topicInfo.timeCommitment,
        }),
      });
      const currData = await currRes.json();
      if (!currData.success) throw new Error(currData.error);

      router.push(`/learn/${slug}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start learning"
      );
      setIsSaving(false);
      setPhase(null);
    }
  };

  const totalPages = structure
    ? scope.included.reduce((sum, id) => {
        const ch = structure.chapters.find((c) => c.id === id);
        return sum + (ch ? ch.pageEnd - ch.pageStart : 0);
      }, 0)
    : 0;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading document structure...
          </p>
        </div>
      </div>
    );
  }

  if (error && !structure) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={() => router.push("/")}>
            Back to topics
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="shrink-0 border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-4">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <BookOpen className="size-5 text-primary" />
          <div className="flex-1">
            <h1 className="font-serif text-lg font-bold text-foreground">
              {structure?.title ?? "Document"}
            </h1>
            {structure?.author && (
              <p className="text-xs text-muted-foreground">
                {structure.author} &middot;{" "}
                {structure.totalPages ?? "?"} pages
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-hidden px-6 py-4">
        <div className="mb-3 flex shrink-0 items-center justify-between">
          <div>
            <h2 className="font-serif text-base font-semibold text-foreground">
              Select what to study
            </h2>
            <p className="text-xs text-muted-foreground">
              {scope.included.length} of {structure?.chapters.length ?? 0}{" "}
              chapters selected &middot; ~{totalPages} pages
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              className="gap-1 text-xs"
            >
              <CheckSquare className="size-3" />
              All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={deselectAll}
              className="gap-1 text-xs"
            >
              <Square className="size-3" />
              None
            </Button>
          </div>
        </div>

        {aiSuggestion && (
          <div className="mb-3 shrink-0 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="mb-1 text-xs font-medium text-foreground">
                  AI Recommendation
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {aiSuggestion}
                </p>
              </div>
            </div>
          </div>
        )}

        {structure && (
          <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border bg-card">
            <ScopeTree toc={structure} scope={scope} onScopeChange={setScope} />
          </div>
        )}

        {error && (
          <p className="mt-2 shrink-0 text-sm text-destructive">{error}</p>
        )}

        <div className="mt-3 shrink-0">
          <Button
            onClick={handleStartLearning}
            disabled={scope.included.length === 0 || isSaving}
            className="w-full gap-2"
            size="lg"
          >
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {phase}
              </>
            ) : (
              <>
                <Play className="size-4" />
                Start Learning ({scope.included.length} chapters)
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
