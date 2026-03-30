import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { getTopicCheckpoints } from "@/lib/db/repository";

export function createFetchQuizResultsTool(topicId: number) {
  return new FunctionTool({
    name: "fetchQuizResults",
    description:
      "Fetches all quiz/checkpoint results for this topic including scores, pass/fail, attempt counts, and score history. Use this to understand the learner's assessment performance.",
    parameters: z.object({}),
    execute: async () => {
      const checkpoints = await getTopicCheckpoints(topicId);
      if (checkpoints.length === 0) {
        return { noData: true, message: "No quiz results available yet." };
      }

      return {
        checkpoints: checkpoints.map((cp) => ({
          moduleId: cp.moduleId,
          passed: cp.passed,
          score: cp.score,
          attemptCount: cp.attemptCount,
          scoresHistory: cp.scoresHistory,
          lastAttemptAt: cp.lastAttemptAt?.toISOString() ?? null,
        })),
      };
    },
  });
}
