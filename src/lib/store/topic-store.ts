import fs from "fs/promises";
import path from "path";
import type {
  Curriculum,
  MasterIndex,
  Progress,
  ResearchCache,
  QuizQuestion,
} from "@/lib/types/learning";
import {
  getTopicDir,
  getResearchCachePath,
  getCurriculumPath,
  getProgressPath,
  getModuleContentPath,
  getModuleDiagramsPath,
  getModuleQuizPath,
  getMasterIndexPath,
} from "./paths";

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

async function writeJson<T>(filePath: string, data: T): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

async function writeText(filePath: string, content: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, "utf-8");
}

export async function readResearchCache(topicSlug: string): Promise<ResearchCache | null> {
  return readJson<ResearchCache>(getResearchCachePath(topicSlug));
}

export async function writeResearchCache(topicSlug: string, data: ResearchCache): Promise<void> {
  await writeJson(getResearchCachePath(topicSlug), data);
}

export async function readCurriculum(topicSlug: string): Promise<Curriculum | null> {
  return readJson<Curriculum>(getCurriculumPath(topicSlug));
}

export async function writeCurriculum(topicSlug: string, data: Curriculum): Promise<void> {
  await writeJson(getCurriculumPath(topicSlug), data);
}

export async function readProgress(topicSlug: string): Promise<Progress | null> {
  return readJson<Progress>(getProgressPath(topicSlug));
}

export async function writeProgress(topicSlug: string, data: Progress): Promise<void> {
  await writeJson(getProgressPath(topicSlug), data);
}

export async function initProgress(topicSlug: string): Promise<Progress> {
  const now = new Date().toISOString();
  const progress: Progress = {
    topic: topicSlug,
    started_at: now,
    last_session: now,
    current_module: 1,
    current_subtopic: 1,
    total_time_minutes: 0,
    modules: {},
    spaced_repetition: {},
  };
  await writeProgress(topicSlug, progress);
  return progress;
}

export async function writeModuleContent(
  topicSlug: string,
  moduleId: number,
  content: string
): Promise<void> {
  await writeText(getModuleContentPath(topicSlug, moduleId), content);
}

export async function readModuleContent(
  topicSlug: string,
  moduleId: number
): Promise<string | null> {
  try {
    return await fs.readFile(getModuleContentPath(topicSlug, moduleId), "utf-8");
  } catch {
    return null;
  }
}

export async function writeModuleDiagrams(
  topicSlug: string,
  moduleId: number,
  diagrams: string
): Promise<void> {
  await writeText(getModuleDiagramsPath(topicSlug, moduleId), diagrams);
}

export async function writeModuleQuiz(
  topicSlug: string,
  moduleId: number,
  questions: QuizQuestion[]
): Promise<void> {
  await writeJson(getModuleQuizPath(topicSlug, moduleId), questions);
}

export async function readModuleQuiz(
  topicSlug: string,
  moduleId: number
): Promise<QuizQuestion[] | null> {
  return readJson<QuizQuestion[]>(getModuleQuizPath(topicSlug, moduleId));
}

export async function readMasterIndex(): Promise<MasterIndex> {
  const data = await readJson<MasterIndex>(getMasterIndexPath());
  return data ?? { topics: {} };
}

export async function updateMasterIndex(
  topicSlug: string,
  displayName: string,
  totalModules: number
): Promise<void> {
  const index = await readMasterIndex();
  const now = new Date().toISOString();
  index.topics[topicSlug] = {
    display_name: displayName,
    started_at: index.topics[topicSlug]?.started_at ?? now,
    last_session: now,
    completion_percent: 0,
    total_modules: totalModules,
    current_module: 1,
  };
  await writeJson(getMasterIndexPath(), index);
}

export async function topicExists(topicSlug: string): Promise<boolean> {
  try {
    await fs.access(getTopicDir(topicSlug));
    return true;
  } catch {
    return false;
  }
}
