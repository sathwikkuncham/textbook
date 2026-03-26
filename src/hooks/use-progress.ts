"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Curriculum } from "@/lib/types/learning";

interface CheckpointStatus {
  passed: boolean;
  score: number;
  attemptCount: number;
}

interface DueReview {
  moduleId: number;
  boxNumber: number;
  nextReviewDate: string;
}

export function useProgress(
  topicId: number | null,
  curriculum: Curriculum | null
) {
  const [completedSubtopics, setCompletedSubtopics] = useState<Set<string>>(
    new Set()
  );
  const [completionPercent, setCompletionPercent] = useState(0);
  const [reviewsDueCount, setReviewsDueCount] = useState(0);
  const [dueReviews, setDueReviews] = useState<DueReview[]>([]);
  const [checkpoints, setCheckpoints] = useState<
    Map<number, CheckpointStatus>
  >(new Map());
  const loadedTopicRef = useRef<number | null>(null);

  const refreshProgress = useCallback(async () => {
    if (!topicId) return;

    try {
      const [progressRes, reviewsRes] = await Promise.all([
        fetch(`/api/learn/progress?topicId=${topicId}`),
        fetch(`/api/learn/reviews?topicId=${topicId}`),
      ]);

      const progressData = await progressRes.json();
      const reviewsData = await reviewsRes.json();

      if (progressData.success) {
        setCompletedSubtopics(
          new Set(progressData.completedSubtopics as string[])
        );

        const cpMap = new Map<number, CheckpointStatus>();
        if (progressData.checkpoints) {
          for (const [key, val] of Object.entries(progressData.checkpoints)) {
            cpMap.set(parseInt(key, 10), val as CheckpointStatus);
          }
        }
        setCheckpoints(cpMap);
      }

      if (reviewsData.success) {
        setReviewsDueCount(reviewsData.dueCount);
        setDueReviews(
          (reviewsData.due ?? []).map(
            (r: { moduleId: number; boxNumber: number; nextReviewDate: string }) => ({
              moduleId: r.moduleId,
              boxNumber: r.boxNumber,
              nextReviewDate: r.nextReviewDate,
            })
          )
        );
      }
    } catch {
      // Silently fail — progress display is non-critical
    }
  }, [topicId]);

  // Calculate completion from completed subtopics vs total
  useEffect(() => {
    if (!curriculum) {
      setCompletionPercent(0);
      return;
    }

    const totalSubtopics = curriculum.modules.reduce(
      (sum, m) => sum + m.subtopics.length,
      0
    );
    if (totalSubtopics === 0) return;

    const completedCount = completedSubtopics.size;
    const passedCheckpoints = Array.from(checkpoints.values()).filter(
      (c) => c.passed
    ).length;
    const totalModules = curriculum.modules.length;

    // 70% weight on subtopic completion, 30% on checkpoint passes
    const subtopicWeight = (completedCount / totalSubtopics) * 70;
    const checkpointWeight =
      totalModules > 0 ? (passedCheckpoints / totalModules) * 30 : 0;

    setCompletionPercent(Math.round(subtopicWeight + checkpointWeight));
  }, [completedSubtopics, checkpoints, curriculum]);

  // Load progress when topicId changes
  useEffect(() => {
    if (topicId && topicId !== loadedTopicRef.current) {
      loadedTopicRef.current = topicId;
      refreshProgress();
    }
  }, [topicId, refreshProgress]);

  // Refresh reviews every 5 minutes
  useEffect(() => {
    if (!topicId) return;
    const interval = setInterval(() => {
      fetch(`/api/learn/reviews?topicId=${topicId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            setReviewsDueCount(data.dueCount);
          }
        })
        .catch(() => {});
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [topicId]);

  const markSubtopicCompleted = useCallback(
    async (moduleId: number, subtopicId: string) => {
      if (!topicId) return;
      if (completedSubtopics.has(subtopicId)) return;

      // Optimistic update
      setCompletedSubtopics((prev) => new Set([...prev, subtopicId]));

      try {
        await fetch("/api/learn/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topicId,
            moduleId,
            subtopicId,
            status: "completed",
          }),
        });
      } catch {
        // Revert on failure
        setCompletedSubtopics((prev) => {
          const next = new Set(prev);
          next.delete(subtopicId);
          return next;
        });
      }
    },
    [topicId, completedSubtopics]
  );

  const isModuleComplete = useCallback(
    (moduleId: number): boolean => {
      if (!curriculum) return false;
      const mod = curriculum.modules.find((m) => m.id === moduleId);
      if (!mod) return false;
      return mod.subtopics.every((s) => completedSubtopics.has(s.id));
    },
    [curriculum, completedSubtopics]
  );

  const isModuleUnlocked = useCallback(
    (moduleId: number): boolean => {
      if (moduleId === 1) return true;
      // Module N is unlocked if module N-1 checkpoint is passed
      const prevCheckpoint = checkpoints.get(moduleId - 1);
      return prevCheckpoint?.passed ?? false;
    },
    [checkpoints]
  );

  return {
    completedSubtopics,
    completionPercent,
    reviewsDueCount,
    dueReviews,
    checkpoints,
    markSubtopicCompleted,
    refreshProgress,
    isModuleComplete,
    isModuleUnlocked,
  };
}
