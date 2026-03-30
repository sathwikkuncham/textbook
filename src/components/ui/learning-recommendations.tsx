"use client";

import { useState, useEffect, useCallback } from "react";
import { Lightbulb, Check, X } from "lucide-react";

interface Recommendation {
  id: string;
  type: string;
  targetModuleId: number;
  targetSubtopicId?: string;
  reason: string;
  details: Record<string, unknown>;
  status: string;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  add_bridge_subtopic: "Add a practice section",
  skip_subtopic: "Skip ahead",
  adjust_difficulty: "Adjust difficulty",
  regenerate_content: "Refresh content",
  adjust_teaching_approach: "Change teaching style",
};

export function LearningRecommendations({ topicId }: { topicId: number | null }) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Fetch pending recommendations
  useEffect(() => {
    if (!topicId) return;

    let cancelled = false;
    async function fetchRecs() {
      try {
        const res = await fetch(`/api/learn/recommendations?topicId=${topicId}`);
        const data = await res.json();
        if (!cancelled && data.recommendations) {
          setRecommendations(data.recommendations);
        }
      } catch {
        // Silent fail — recommendations are supplementary
      }
    }

    fetchRecs();
    // Poll every 30 seconds for new recommendations
    const interval = setInterval(fetchRecs, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [topicId]);

  const handleAction = useCallback(
    async (modificationId: string, action: "accept" | "reject") => {
      if (!topicId) return;

      // Optimistic UI — remove immediately
      setDismissed((prev) => new Set(prev).add(modificationId));

      try {
        await fetch("/api/learn/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topicId, modificationId, action }),
        });

        if (action === "accept") {
          // Reload the page to reflect curriculum changes
          window.location.reload();
        }
      } catch {
        // Revert optimistic update on failure
        setDismissed((prev) => {
          const next = new Set(prev);
          next.delete(modificationId);
          return next;
        });
      }
    },
    [topicId]
  );

  const visible = recommendations.filter((r) => !dismissed.has(r.id));
  if (visible.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      {visible.map((rec) => (
        <div
          key={rec.id}
          className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4"
        >
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {TYPE_LABELS[rec.type] ?? rec.type}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {rec.reason}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => handleAction(rec.id, "accept")}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Check className="size-3" />
                Accept
              </button>
              <button
                onClick={() => handleAction(rec.id, "reject")}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-3" />
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
