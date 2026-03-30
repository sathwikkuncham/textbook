import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { findLearnerInsights } from "@/lib/db/repository";

export function createFetchLearnerModelTool(topicId: number) {
  return new FunctionTool({
    name: "fetchLearnerModel",
    description:
      "Fetches the learner's profile including concept mastery levels, strengths, weaknesses, learning style, and engagement patterns. Use this to understand where the learner stands before making recommendations.",
    parameters: z.object({}),
    execute: async () => {
      const insights = await findLearnerInsights(topicId);
      if (!insights) {
        return {
          noData: true,
          message:
            "No learner model available yet. Not enough interactions to build a profile.",
        };
      }
      return {
        conceptMastery: insights.conceptMastery,
        strengthAreas: insights.strengthAreas,
        weakAreas: insights.weakAreas,
        learningStyle: insights.learningStyle,
        engagementProfile: insights.engagementProfile,
        lastUpdated: insights.updatedAt.toISOString(),
      };
    },
  });
}
