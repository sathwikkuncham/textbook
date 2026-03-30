import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { findModuleContent } from "@/lib/db/repository";

export function createFetchSubtopicContentTool(
  topicId: number,
  moduleId: number,
  subtopics: Array<{ id: string; title: string }>
) {
  const available = subtopics.map((s, i) => ({
    id: s.id,
    title: s.title,
    index: i,
    dbKey: moduleId * 100 + i,
  }));

  const availableList = available.map((s) => `${s.id}: ${s.title}`).join(", ");

  return new FunctionTool({
    name: "fetchSubtopicContent",
    description: `Fetches the full teaching content of a subtopic in this module. Use this to read what was actually taught so you can write questions that reference specific analogies, examples, and terminology from the content. Available subtopics: ${availableList}`,
    parameters: z.object({
      subtopicId: z
        .string()
        .describe("The subtopic ID to fetch, e.g. '1.1' or '2.3'"),
    }),
    execute: async ({ subtopicId }) => {
      const match = available.find((s) => s.id === subtopicId);
      if (!match) {
        return {
          error: `Subtopic "${subtopicId}" not found. Available: ${available.map((s) => s.id).join(", ")}`,
        };
      }

      const content = await findModuleContent(topicId, match.dbKey);
      if (!content) {
        return {
          error: `Content for subtopic ${subtopicId} has not been generated yet.`,
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
