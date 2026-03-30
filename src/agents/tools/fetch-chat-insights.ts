import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { getChatSessions, getChatHistory } from "@/lib/db/repository";

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

      let totalInteractions = 0;
      const actionCounts: Record<string, number> = {
        explain: 0,
        go_deeper: 0,
        simplify: 0,
      };
      const recentQuestions: string[] = [];

      for (const session of sessions.slice(0, 5)) {
        const history = await getChatHistory(session.id, 50);
        for (const msg of history) {
          if (msg.role === "user") {
            totalInteractions++;
            const content = msg.content.toLowerCase();
            if (content.includes("explain")) actionCounts.explain++;
            if (content.includes("go deeper") || content.includes("go_deeper"))
              actionCounts.go_deeper++;
            if (content.includes("simplify")) actionCounts.simplify++;
            if (recentQuestions.length < 10) {
              recentQuestions.push(msg.content.slice(0, 200));
            }
          }
        }
      }

      return {
        totalInteractions,
        actionCounts,
        recentQuestions,
        sessionCount: sessions.length,
      };
    },
  });
}
