import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { saveCurriculumModifications } from "@/lib/db/repository";
import { randomUUID } from "crypto";

/**
 * Tool that lets the content composer signal that a subtopic is too large
 * and should be split. Creates a curriculum modification (pending approval).
 * The current generation continues for the first part; remaining parts
 * are suggested as new subtopics.
 */
export function createSignalSubtopicExpansionTool(
  topicId: number,
  moduleId: number,
  currentSubtopicId: string
) {
  return new FunctionTool({
    name: "signalSubtopicExpansion",
    description:
      "Signal that this subtopic covers too much material for a single lesson and should be split. Call this BEFORE writing if you determine the scope is too broad. Describe what parts you'll cover now and what should be deferred to new subtopics.",
    parameters: z.object({
      reason: z
        .string()
        .describe("Why this subtopic needs to be split — what makes it too broad for one lesson"),
      coveredNow: z
        .string()
        .describe("What you will cover in the current generation"),
      suggestedSubtopics: z
        .array(
          z.object({
            title: z.string().describe("Title for the new subtopic"),
            keyConcepts: z
              .array(z.string())
              .describe("Key concepts for the new subtopic"),
          })
        )
        .describe("New subtopics to add after this one"),
    }),
    execute: async ({ reason, coveredNow, suggestedSubtopics }) => {
      try {
        await saveCurriculumModifications(topicId, [
          {
            id: randomUUID(),
            type: "expand_subtopic",
            targetModuleId: moduleId,
            targetSubtopicId: currentSubtopicId,
            reason,
            details: {
              coveredNow,
              suggestedSubtopics,
            },
            status: "pending",
            createdAt: new Date().toISOString(),
          },
        ]);

        return {
          success: true,
          message: `Expansion signal recorded. Proceed to write content covering: ${coveredNow}. The additional subtopics will be suggested to the learner.`,
        };
      } catch (err) {
        return {
          error: err instanceof Error ? err.message : "Failed to signal expansion",
        };
      }
    },
  });
}
