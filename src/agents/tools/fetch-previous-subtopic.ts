import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { findModuleContent } from "@/lib/db/repository";

/**
 * Creates a tool that lets the agent read any previously generated subtopic's content.
 * Supports both within-module and cross-module continuity.
 *
 * Overload 1: Pre-built available list (used by content route for cross-module access)
 * Overload 2: Module-scoped (used by chat tutor for within-module access)
 */
export function createFetchPreviousSubtopicTool(
  topicId: number,
  availableOrModuleId: Array<{ id: string; title: string; dbKey: number }> | number,
  currentSubtopicIndex?: number,
  subtopics?: Array<{ id: string; title: string }>
) {
  let available: Array<{ id: string; title: string; dbKey: number }>;

  if (Array.isArray(availableOrModuleId)) {
    // Pre-built list (cross-module)
    available = availableOrModuleId;
  } else {
    // Module-scoped (backward compatible)
    const moduleId = availableOrModuleId;
    available = (subtopics ?? [])
      .slice(0, currentSubtopicIndex ?? 0)
      .map((s, i) => ({
        id: s.id,
        title: s.title,
        dbKey: moduleId * 100 + i,
      }));
  }

  const availableList = available.map((s) => `${s.id}: ${s.title}`).join(", ");

  return new FunctionTool({
    name: "fetchPreviousSubtopic",
    description: `Fetches the full teaching content of a previously covered subtopic. Use this to read what was taught before — across any earlier module or earlier in the current module — so you can build on it, reference its concepts, extend its analogies, or connect your explanation to established knowledge. Available subtopics: ${availableList}`,
    parameters: z.object({
      subtopicId: z
        .string()
        .describe("The subtopic ID to fetch, e.g. '1.1' or '2.3'"),
    }),
    execute: async ({ subtopicId }) => {
      const match = available.find((s) => s.id === subtopicId);
      if (!match) {
        return {
          error: `Subtopic "${subtopicId}" is not available. Available: ${available.map((s) => s.id).join(", ")}`,
        };
      }

      const content = await findModuleContent(topicId, match.dbKey);
      if (!content) {
        return {
          error: `Subtopic ${subtopicId} has not been generated yet.`,
        };
      }

      return {
        subtopicId: match.id,
        title: match.title,
        content: content.content,
      };
    },
  });
}
