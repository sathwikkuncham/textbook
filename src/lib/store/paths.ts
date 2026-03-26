import path from "path";

const DATA_ROOT = path.join(process.cwd(), "data", "deep-learn");

export function getTopicDir(topicSlug: string): string {
  return path.join(DATA_ROOT, topicSlug);
}

export function getResearchCachePath(topicSlug: string): string {
  return path.join(getTopicDir(topicSlug), "research-cache.json");
}

export function getCurriculumPath(topicSlug: string): string {
  return path.join(getTopicDir(topicSlug), "curriculum.json");
}

export function getProgressPath(topicSlug: string): string {
  return path.join(getTopicDir(topicSlug), "progress.json");
}

export function getModuleContentPath(topicSlug: string, moduleId: number): string {
  return path.join(getTopicDir(topicSlug), `module-${moduleId}-content.md`);
}

export function getModuleDiagramsPath(topicSlug: string, moduleId: number): string {
  return path.join(getTopicDir(topicSlug), `module-${moduleId}-diagrams.md`);
}

export function getModuleQuizPath(topicSlug: string, moduleId: number): string {
  return path.join(getTopicDir(topicSlug), `module-${moduleId}-quiz.json`);
}

export function getMasterIndexPath(): string {
  return path.join(DATA_ROOT, "_index.json");
}
