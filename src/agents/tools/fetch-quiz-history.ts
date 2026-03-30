import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { getTopicCheckpoints } from "@/lib/db/repository";

export function createFetchQuizHistoryTool(topicId: number) {
  return new FunctionTool({
    name: "fetchQuizHistory",
    description:
      "Fetches the complete quiz performance history across all modules for this topic. Includes pass/fail, scores, attempt counts, and score trajectories. Use this to identify patterns: which modules are problematic, is performance improving or declining, are there repeated failures.",
    parameters: z.object({}),
    execute: async () => {
      const checkpoints = await getTopicCheckpoints(topicId);
      if (checkpoints.length === 0) {
        return { noData: true, message: "No quiz history available." };
      }
      return {
        totalModulesAttempted: checkpoints.length,
        passedModules: checkpoints.filter((c) => c.passed).length,
        failedModules: checkpoints.filter((c) => !c.passed).length,
        checkpoints: checkpoints.map((c) => ({
          moduleId: c.moduleId,
          passed: c.passed,
          score: c.score,
          attemptCount: c.attemptCount,
          scoresHistory: c.scoresHistory,
          lastAttemptAt: c.lastAttemptAt?.toISOString() ?? null,
        })),
      };
    },
  });
}
