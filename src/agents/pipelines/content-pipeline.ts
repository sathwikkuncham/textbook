import { ParallelAgent } from "@google/adk";
import { createContentComposer } from "../content-composer";
import { createDiagramSpecialist } from "../diagram-specialist";

export function createContentPipeline(
  topic: string,
  level: string,
  moduleTitle: string,
  subtopicsList: string,
  researchContext: string
) {
  const contentComposer = createContentComposer(
    topic,
    level,
    moduleTitle,
    subtopicsList,
    researchContext
  );

  const diagramSpecialist = createDiagramSpecialist(
    topic,
    moduleTitle,
    subtopicsList
  );

  return new ParallelAgent({
    name: "ContentPipeline",
    description: "Runs content composer and diagram specialist in parallel",
    subAgents: [contentComposer, diagramSpecialist],
  });
}
