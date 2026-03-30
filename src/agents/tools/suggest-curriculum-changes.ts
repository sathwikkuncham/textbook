import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { saveCurriculumModifications } from "@/lib/db/repository";

export function createSuggestCurriculumChangesTool(topicId: number) {
  return new FunctionTool({
    name: "suggestCurriculumChanges",
    description:
      "Proposes curriculum modifications. Each modification is saved as 'pending' and must be accepted by the learner before taking effect. Use this to recommend adding bridge subtopics, skipping mastered content, adjusting difficulty, or regenerating content with a different focus. Be conservative — only recommend changes backed by clear evidence from the learner model and quiz history.",
    parameters: z.object({
      modifications: z
        .array(
          z.object({
            type: z
              .enum([
                "add_bridge_subtopic",
                "skip_subtopic",
                "adjust_difficulty",
                "regenerate_content",
                "adjust_teaching_approach",
              ])
              .describe("Type of curriculum modification"),
            targetModuleId: z
              .number()
              .describe("The module ID this modification targets"),
            targetSubtopicId: z
              .string()
              .optional()
              .describe("Specific subtopic ID if applicable"),
            reason: z
              .string()
              .describe(
                "Evidence-based reason for this recommendation"
              ),
            details: z
              .record(z.string(), z.unknown())
              .optional()
              .describe(
                "Additional details specific to the modification type"
              ),
          })
        )
        .describe("Array of proposed curriculum modifications"),
    }),
    execute: async ({ modifications }) => {
      if (modifications.length === 0) {
        return { saved: false, message: "No modifications provided." };
      }

      const records = modifications.map((m) => ({
        id: crypto.randomUUID(),
        type: m.type,
        targetModuleId: m.targetModuleId,
        targetSubtopicId: m.targetSubtopicId,
        reason: m.reason,
        details: m.details ?? {},
        status: "pending" as const,
        createdAt: new Date().toISOString(),
      }));

      await saveCurriculumModifications(topicId, records);

      return {
        saved: true,
        modificationCount: records.length,
        modificationIds: records.map((r) => r.id),
      };
    },
  });
}
