import { SequentialAgent } from "@google/adk";
import { createResearchPipeline } from "./research-pipeline";
import { createCurriculumArchitect } from "../curriculum-architect";

export function createLearningPipeline(
  topic: string,
  level: string,
  goal: string,
  timeCommitment: string
) {
  const researchPipeline = createResearchPipeline(topic, level, goal);
  const curriculumArchitect = createCurriculumArchitect(
    topic,
    level,
    goal,
    timeCommitment
  );

  return new SequentialAgent({
    name: "LearningPipeline",
    description:
      "Full learning pipeline: parallel research → curriculum design",
    subAgents: [researchPipeline, curriculumArchitect],
  });
}
