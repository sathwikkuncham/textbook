import { eq, and, asc, desc, lte, ilike, sql } from "drizzle-orm";
import { db } from "./client";
import {
  topics,
  researchCache,
  curricula,
  moduleContent,
  moduleQuizzes,
  progress,
  checkpoints,
  sourceStructures,
  sourcePageCache,
  spacedRepetition,
  chatSessions,
  chatHistory,
} from "./schema";
import type {
  Curriculum,
  ResearchCache,
  QuizQuestion,
  SourceToc,
  PageCalibration,
  UserScopeSelection,
} from "@/lib/types/learning";

// ── Topics ──────────────────────────────────────────────

export async function findTopicBySlug(slug: string) {
  const result = await db
    .select()
    .from(topics)
    .where(eq(topics.slug, slug))
    .limit(1);
  return result[0] ?? null;
}

export async function createTopic(data: {
  slug: string;
  displayName: string;
  level: string;
  goal: string;
  timeCommitment: string;
}) {
  const result = await db.insert(topics).values(data).returning();
  return result[0];
}

export async function updateTopic(
  topicId: number,
  data: Partial<{
    totalModules: number;
    estimatedMinutes: number;
    completionPercent: number;
    currentModule: number;
    currentSubtopic: number;
    totalTimeMinutes: number;
    lastSession: Date;
  }>
) {
  await db.update(topics).set(data).where(eq(topics.id, topicId));
}

export async function getAllTopics() {
  return db.select().from(topics).orderBy(topics.lastSession);
}

// ── Research Cache ──────────────────────────────────────

export async function findResearchByTopicId(topicId: number) {
  const result = await db
    .select()
    .from(researchCache)
    .where(eq(researchCache.topicId, topicId))
    .limit(1);
  if (!result[0]) return null;
  return {
    foundations: result[0].foundations,
    applications: result[0].applications,
  } as ResearchCache;
}

export async function saveResearch(
  topicId: number,
  data: ResearchCache
) {
  const existing = await db
    .select({ id: researchCache.id })
    .from(researchCache)
    .where(eq(researchCache.topicId, topicId))
    .limit(1);

  if (existing[0]) {
    await db
      .update(researchCache)
      .set({
        foundations: data.foundations as unknown as Record<string, unknown>,
        applications: data.applications as unknown as Record<string, unknown>,
      })
      .where(eq(researchCache.id, existing[0].id));
  } else {
    await db.insert(researchCache).values({
      topicId,
      foundations: data.foundations as unknown as Record<string, unknown>,
      applications: data.applications as unknown as Record<string, unknown>,
    });
  }
}

// ── Curricula ───────────────────────────────────────────

export async function findCurriculumByTopicId(topicId: number) {
  const result = await db
    .select()
    .from(curricula)
    .where(eq(curricula.topicId, topicId))
    .limit(1);
  if (!result[0]) return null;
  return result[0].structure as unknown as Curriculum;
}

export async function saveCurriculum(
  topicId: number,
  curriculum: Curriculum
) {
  const existing = await db
    .select({ id: curricula.id })
    .from(curricula)
    .where(eq(curricula.topicId, topicId))
    .limit(1);

  if (existing[0]) {
    await db
      .update(curricula)
      .set({ structure: curriculum as unknown as Record<string, unknown> })
      .where(eq(curricula.id, existing[0].id));
  } else {
    await db.insert(curricula).values({
      topicId,
      structure: curriculum as unknown as Record<string, unknown>,
    });
  }
}

// ── Module Content ──────────────────────────────────────

export async function findModuleContent(
  topicId: number,
  moduleId: number
) {
  const result = await db
    .select()
    .from(moduleContent)
    .where(
      and(
        eq(moduleContent.topicId, topicId),
        eq(moduleContent.moduleId, moduleId)
      )
    )
    .limit(1);
  return result[0] ?? null;
}

export async function saveModuleContent(
  topicId: number,
  moduleId: number,
  content: string,
  diagrams: string
) {
  const existing = await findModuleContent(topicId, moduleId);

  if (existing) {
    await db
      .update(moduleContent)
      .set({ content, diagrams })
      .where(eq(moduleContent.id, existing.id));
  } else {
    await db.insert(moduleContent).values({
      topicId,
      moduleId,
      content,
      diagrams,
    });
  }
}

// ── Module Quizzes ──────────────────────────────────────

export async function findModuleQuiz(
  topicId: number,
  moduleId: number
) {
  const result = await db
    .select()
    .from(moduleQuizzes)
    .where(
      and(
        eq(moduleQuizzes.topicId, topicId),
        eq(moduleQuizzes.moduleId, moduleId)
      )
    )
    .limit(1);
  if (!result[0]) return null;
  return result[0].questions as unknown as QuizQuestion[];
}

export async function saveModuleQuiz(
  topicId: number,
  moduleId: number,
  questions: QuizQuestion[]
) {
  const existing = await db
    .select({ id: moduleQuizzes.id })
    .from(moduleQuizzes)
    .where(
      and(
        eq(moduleQuizzes.topicId, topicId),
        eq(moduleQuizzes.moduleId, moduleId)
      )
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(moduleQuizzes)
      .set({ questions: questions as unknown as Record<string, unknown>[] })
      .where(eq(moduleQuizzes.id, existing[0].id));
  } else {
    await db.insert(moduleQuizzes).values({
      topicId,
      moduleId,
      questions: questions as unknown as Record<string, unknown>[],
    });
  }
}

// ── Progress ────────────────────────────────────────────

export async function getSubtopicProgress(topicId: number) {
  return db
    .select()
    .from(progress)
    .where(eq(progress.topicId, topicId));
}

export async function updateSubtopicProgress(
  topicId: number,
  moduleId: number,
  subtopicId: string,
  status: string
) {
  const existing = await db
    .select({ id: progress.id })
    .from(progress)
    .where(
      and(
        eq(progress.topicId, topicId),
        eq(progress.subtopicId, subtopicId)
      )
    )
    .limit(1);

  const completedAt = status === "completed" ? new Date() : null;

  if (existing[0]) {
    await db
      .update(progress)
      .set({ status, completedAt })
      .where(eq(progress.id, existing[0].id));
  } else {
    await db.insert(progress).values({
      topicId,
      moduleId,
      subtopicId,
      status,
      completedAt,
    });
  }
}

// ── Checkpoints ─────────────────────────────────────────

export async function findCheckpoint(topicId: number, moduleId: number) {
  const result = await db
    .select()
    .from(checkpoints)
    .where(
      and(
        eq(checkpoints.topicId, topicId),
        eq(checkpoints.moduleId, moduleId)
      )
    )
    .limit(1);
  return result[0] ?? null;
}

export async function saveCheckpoint(
  topicId: number,
  moduleId: number,
  data: {
    passed: boolean;
    score: number;
    attemptCount: number;
    scoresHistory: number[];
  }
) {
  const existing = await findCheckpoint(topicId, moduleId);

  if (existing) {
    await db
      .update(checkpoints)
      .set({ ...data, lastAttemptAt: new Date() })
      .where(eq(checkpoints.id, existing.id));
  } else {
    await db.insert(checkpoints).values({
      topicId,
      moduleId,
      ...data,
      lastAttemptAt: new Date(),
    });
  }
}

// ── Spaced Repetition ───────────────────────────────────

export async function getReviewsDue(topicId?: number) {
  const now = new Date();
  if (topicId) {
    return db
      .select()
      .from(spacedRepetition)
      .where(
        and(
          eq(spacedRepetition.topicId, topicId),
          lte(spacedRepetition.nextReviewDate, now)
        )
      );
  }
  return db
    .select()
    .from(spacedRepetition)
    .where(lte(spacedRepetition.nextReviewDate, now));
}

export async function getAllReviews(topicId: number) {
  return db
    .select()
    .from(spacedRepetition)
    .where(eq(spacedRepetition.topicId, topicId));
}

export async function getTopicCheckpoints(topicId: number) {
  return db
    .select()
    .from(checkpoints)
    .where(eq(checkpoints.topicId, topicId));
}

export async function saveReviewSchedule(
  topicId: number,
  moduleId: number,
  data: {
    boxNumber: number;
    nextReviewDate: Date;
    lastReviewDate: Date;
    lastScore: number;
    reviewHistory: Array<{ date: string; score: number }>;
  }
) {
  const existing = await db
    .select({ id: spacedRepetition.id })
    .from(spacedRepetition)
    .where(
      and(
        eq(spacedRepetition.topicId, topicId),
        eq(spacedRepetition.moduleId, moduleId)
      )
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(spacedRepetition)
      .set(data)
      .where(eq(spacedRepetition.id, existing[0].id));
  } else {
    await db.insert(spacedRepetition).values({ topicId, moduleId, ...data });
  }
}

// ── Source Structures ─────────────────────────────────

export async function findSourceStructure(topicId: number) {
  const result = await db
    .select()
    .from(sourceStructures)
    .where(eq(sourceStructures.topicId, topicId))
    .limit(1);
  if (!result[0]) return null;
  return {
    id: result[0].id,
    rawToc: result[0].rawToc as unknown as SourceToc,
    calibration: result[0].calibration as unknown as PageCalibration,
    userScope: result[0].userScope as unknown as UserScopeSelection | null,
  };
}

export async function saveSourceStructure(
  topicId: number,
  rawToc: SourceToc,
  calibration: PageCalibration
) {
  const existing = await db
    .select({ id: sourceStructures.id })
    .from(sourceStructures)
    .where(eq(sourceStructures.topicId, topicId))
    .limit(1);

  if (existing[0]) {
    await db
      .update(sourceStructures)
      .set({
        rawToc: rawToc as unknown as Record<string, unknown>,
        calibration: calibration as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(sourceStructures.id, existing[0].id));
  } else {
    await db.insert(sourceStructures).values({
      topicId,
      rawToc: rawToc as unknown as Record<string, unknown>,
      calibration: calibration as unknown as Record<string, unknown>,
    });
  }
}

export async function updateUserScope(
  topicId: number,
  scope: UserScopeSelection
) {
  await db
    .update(sourceStructures)
    .set({
      userScope: scope as unknown as Record<string, unknown>,
      updatedAt: new Date(),
    })
    .where(eq(sourceStructures.topicId, topicId));
}

// ── Source Page Cache ──────────────────────────────────

export async function findCachedPageText(
  topicId: number,
  sectionKey: string
) {
  const result = await db
    .select()
    .from(sourcePageCache)
    .where(
      and(
        eq(sourcePageCache.topicId, topicId),
        eq(sourcePageCache.sectionKey, sectionKey)
      )
    )
    .limit(1);
  return result[0]?.extractedText ?? null;
}

export async function cachePageText(
  topicId: number,
  sectionKey: string,
  pageRangeStart: number,
  pageRangeEnd: number,
  extractedText: string
) {
  const existing = await db
    .select({ id: sourcePageCache.id })
    .from(sourcePageCache)
    .where(
      and(
        eq(sourcePageCache.topicId, topicId),
        eq(sourcePageCache.sectionKey, sectionKey)
      )
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(sourcePageCache)
      .set({ extractedText, pageRangeStart, pageRangeEnd })
      .where(eq(sourcePageCache.id, existing[0].id));
  } else {
    await db.insert(sourcePageCache).values({
      topicId,
      sectionKey,
      pageRangeStart,
      pageRangeEnd,
      extractedText,
    });
  }
}

// ── Chat Sessions & History ───────────────────────────

export async function getChatSessions(topicId: number) {
  return db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.topicId, topicId))
    .orderBy(desc(chatSessions.updatedAt));
}

export async function createChatSession(topicId: number, title?: string) {
  const result = await db
    .insert(chatSessions)
    .values({ topicId, title: title ?? "New Chat" })
    .returning();
  return result[0];
}

export async function updateChatSessionTitle(
  sessionId: number,
  title: string
) {
  await db
    .update(chatSessions)
    .set({ title, updatedAt: new Date() })
    .where(eq(chatSessions.id, sessionId));
}

export async function deleteChatSession(sessionId: number) {
  await db
    .delete(chatSessions)
    .where(eq(chatSessions.id, sessionId));
}

export async function getChatHistory(
  sessionId: number,
  limit: number = 50
) {
  return db
    .select({
      id: chatHistory.id,
      role: chatHistory.role,
      content: chatHistory.content,
      createdAt: chatHistory.createdAt,
    })
    .from(chatHistory)
    .where(eq(chatHistory.sessionId, sessionId))
    .orderBy(asc(chatHistory.createdAt))
    .limit(limit);
}

export async function appendChatMessage(
  sessionId: number,
  topicId: number,
  moduleId: number | null,
  subtopicId: string | null,
  role: string,
  content: string
) {
  // Update session timestamp
  await db
    .update(chatSessions)
    .set({ updatedAt: new Date() })
    .where(eq(chatSessions.id, sessionId));

  const result = await db
    .insert(chatHistory)
    .values({ sessionId, topicId, moduleId, subtopicId, role, content })
    .returning();
  return result[0];
}

// ── Search ──────────────────────────────────────────────

export async function getAllCurricula() {
  return db
    .select({
      topicId: curricula.topicId,
      structure: curricula.structure,
    })
    .from(curricula);
}

export async function searchModuleContent(query: string, limit = 20) {
  const escaped = query.replace(/%/g, "\\%").replace(/_/g, "\\_");
  return db
    .select({
      id: moduleContent.id,
      topicId: moduleContent.topicId,
      moduleId: moduleContent.moduleId,
      content: moduleContent.content,
    })
    .from(moduleContent)
    .where(ilike(moduleContent.content, `%${escaped}%`))
    .limit(limit);
}
