import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { getLearnerSignals } from "@/lib/db/repository";

export function createFetchSignalsTool(topicId: number) {
  return new FunctionTool({
    name: "fetchSignals",
    description:
      "Fetches raw learner interaction signals including time-on-subtopic, text selections, backtracking events, and other engagement data. Use this to understand HOW the learner interacts with the content, not just what they scored.",
    parameters: z.object({
      signalType: z
        .string()
        .optional()
        .describe(
          "Filter by signal type, e.g. 'time_on_subtopic', 'text_selection', 'backtrack'. Omit for all signals."
        ),
    }),
    execute: async ({ signalType }) => {
      const signals = await getLearnerSignals(
        topicId,
        signalType ?? undefined,
        100
      );
      if (signals.length === 0) {
        return {
          noData: true,
          message: "No engagement signals recorded yet.",
        };
      }

      return {
        signalCount: signals.length,
        signals: signals.map((s) => ({
          type: s.signalType,
          moduleId: s.moduleId,
          subtopicId: s.subtopicId,
          data: s.data,
          timestamp: s.createdAt.toISOString(),
        })),
      };
    },
  });
}
