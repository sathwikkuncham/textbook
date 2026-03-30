import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { findResearchByTopicId } from "@/lib/db/repository";

export function createFetchResearchContextTool(topicId: number) {
  return new FunctionTool({
    name: "fetchResearchContext",
    description:
      "Fetches the research findings (foundational concepts, applications, analogies, misconceptions) for this topic. Use this to verify content accuracy against the original research.",
    parameters: z.object({}),
    execute: async () => {
      const research = await findResearchByTopicId(topicId);
      if (!research) {
        return {
          noData: true,
          message: "No research data found for this topic.",
        };
      }

      return {
        foundations: research.foundations,
        applications: research.applications,
      };
    },
  });
}
