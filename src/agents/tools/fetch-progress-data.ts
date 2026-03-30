import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { getSubtopicProgress, getAllReviews } from "@/lib/db/repository";

export function createFetchProgressDataTool(topicId: number) {
  return new FunctionTool({
    name: "fetchProgressData",
    description:
      "Fetches learning progress data including subtopic completion status, spaced repetition box positions, and review history. Use this to understand the learner's pace and retention patterns.",
    parameters: z.object({}),
    execute: async () => {
      const progress = await getSubtopicProgress(topicId);
      const reviews = await getAllReviews(topicId);

      const completed = progress.filter((p) => p.status === "completed");
      const inProgress = progress.filter((p) => p.status === "in_progress");

      return {
        totalTracked: progress.length,
        completedCount: completed.length,
        inProgressCount: inProgress.length,
        completedSubtopics: completed.map((p) => ({
          subtopicId: p.subtopicId,
          completedAt: p.completedAt?.toISOString() ?? null,
        })),
        spacedRepetition: reviews.map((r) => ({
          moduleId: r.moduleId,
          boxNumber: r.boxNumber,
          nextReviewDate: r.nextReviewDate.toISOString(),
          lastScore: r.lastScore,
          reviewHistory: r.reviewHistory,
        })),
      };
    },
  });
}
