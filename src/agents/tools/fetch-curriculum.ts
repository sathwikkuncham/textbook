import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { findCurriculumByTopicId } from "@/lib/db/repository";

export function createFetchCurriculumTool(topicId: number) {
  return new FunctionTool({
    name: "fetchCurriculum",
    description:
      "Fetches the full curriculum structure including all modules, subtopics, key concepts, teaching approaches, and checkpoint configurations. Use this to understand what the learner is studying and what comes next.",
    parameters: z.object({}),
    execute: async () => {
      const curriculum = await findCurriculumByTopicId(topicId);
      if (!curriculum) {
        return { noData: true, message: "No curriculum found for this topic." };
      }
      return {
        topic: curriculum.topic,
        level: curriculum.level,
        goal: curriculum.goal,
        totalModules: curriculum.modules.length,
        modules: curriculum.modules.map((m) => ({
          id: m.id,
          title: m.title,
          estimatedMinutes: m.estimated_minutes,
          subtopics: m.subtopics.map((s) => ({
            id: s.id,
            title: s.title,
            keyConcepts: s.key_concepts,
            teachingApproach: s.teaching_approach,
          })),
          checkpoint: m.checkpoint,
        })),
      };
    },
  });
}
