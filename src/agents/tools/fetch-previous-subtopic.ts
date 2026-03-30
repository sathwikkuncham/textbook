import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { findModuleContent } from "@/lib/db/repository";

export function createFetchPreviousSubtopicTool(
  topicId: number,
  moduleId: number,
  currentSubtopicIndex: number,
  subtopics: Array<{ id: string; title: string }>
) {
  const available = subtopics
    .slice(0, currentSubtopicIndex)
    .map((s, i) => ({
      id: s.id,
      title: s.title,
      index: i,
      dbKey: moduleId * 100 + i,
    }));

  const availableList = available.map((s) => `${s.id}: ${s.title}`).join(", ");

  return new FunctionTool({
    name: "fetchPreviousSubtopic",
    description: `Fetches the full teaching content of a previously covered subtopic in this module. Use this to read what was taught before so you can build on it, reference its concepts, extend its analogies, or connect your explanation to established knowledge. Available subtopics: ${availableList}`,
    parameters: z.object({
      subtopicId: z
        .string()
        .describe("The subtopic ID to fetch, e.g. '1.1' or '2.3'"),
    }),
    execute: async ({ subtopicId }) => {
      const match = available.find((s) => s.id === subtopicId);
      if (!match) {
        return {
          error: `Subtopic "${subtopicId}" is not available. You can only read subtopics before the current one. Available: ${available.map((s) => s.id).join(", ")}`,
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
