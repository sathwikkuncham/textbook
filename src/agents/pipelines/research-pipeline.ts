import { ParallelAgent } from "@google/adk";
import {
  createFoundationsResearcher,
  createApplicationsResearcher,
} from "../topic-researcher";

export function createResearchPipeline(
  topic: string,
  level: string,
  goal: string,
  interviewContext?: string
) {
  const foundationsResearcher = createFoundationsResearcher(topic, level, goal, interviewContext);
  const applicationsResearcher = createApplicationsResearcher(topic, level, goal, interviewContext);

  return new ParallelAgent({
    name: "ResearchPipeline",
    description: "Runs two researchers in parallel: foundations and applications",
    subAgents: [foundationsResearcher, applicationsResearcher],
  });
}
