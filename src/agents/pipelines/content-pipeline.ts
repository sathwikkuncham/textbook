import { createContentComposer } from "../content-composer";

/**
 * @deprecated Content generation is now handled directly in the content route
 * with inline evaluation and revision. This pipeline wrapper is no longer used.
 */
export function createContentPipeline(
  topic: string,
  level: string,
  moduleTitle: string,
  subtopicsList: string,
  researchContext: string
) {
  return createContentComposer(
    topic,
    level,
    moduleTitle,
    subtopicsList,
    researchContext
  );
}
