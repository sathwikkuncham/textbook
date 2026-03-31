import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { getChatSessions, getChatHistory, getLearnerSignals } from "@/lib/db/repository";

export function createFetchChatInsightsTool(topicId: number) {
  return new FunctionTool({
    name: "fetchChatInsights",
    description:
      "Fetches chat interaction patterns for this topic. Returns action counts (explain/go_deeper/simplify), total interactions, and recent questions. Use this to understand what the learner finds confusing or wants to explore deeper.",
    parameters: z.object({}),
    execute: async () => {
      const sessions = await getChatSessions(topicId);
      if (sessions.length === 0) {
        return { noData: true, message: "No chat interactions yet." };
      }

      // Count total chat interactions from sessions
      let totalInteractions = 0;
      const recentQuestions: string[] = [];

      for (const session of sessions.slice(0, 5)) {
        const history = await getChatHistory(session.id, 50);
        for (const msg of history) {
          if (msg.role === "user") {
            totalInteractions++;
            if (recentQuestions.length < 10) {
              recentQuestions.push(msg.content.slice(0, 200));
            }
          }
        }
      }

      // Get action counts from structured signals instead of substring matching
      const actionSignals = await getLearnerSignals(topicId, "chat_action", 100);
      const actionCounts: Record<string, number> = { explain: 0, go_deeper: 0, simplify: 0 };
      for (const signal of actionSignals) {
        const action = (signal.data as Record<string, unknown>)?.action as string;
        if (action && action in actionCounts) {
          actionCounts[action]++;
        }
      }

      return { totalInteractions, actionCounts, recentQuestions, sessionCount: sessions.length };
    },
  });
}
