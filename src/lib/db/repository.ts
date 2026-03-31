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
  learnerInsights,
  learnerSignals,
  contentEvaluations,
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
  category?: string;
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

// ── Curriculum Modifications ───────────────────────────

export async function getCurriculumModifications(topicId: number) {
  const result = await db
    .select({ modifications: curricula.modifications })
    .from(curricula)
    .where(eq(curricula.topicId, topicId))
    .limit(1);
  return (result[0]?.modifications as unknown as Array<{
    id: string;
    type: string;
    targetModuleId: number;
    targetSubtopicId?: string;
    reason: string;
    details: Record<string, unknown>;
    status: string;
    createdAt: string;
  }>) ?? [];
}

export async function saveCurriculumModifications(
  topicId: number,
  newModifications: Array<{
    id: string;
    type: string;
    targetModuleId: number;
    targetSubtopicId?: string;
    reason: string;
    details: Record<string, unknown>;
    status: string;
    createdAt: string;
  }>
) {
  const existing = await getCurriculumModifications(topicId);
  const merged = [...existing, ...newModifications];
  await db
    .update(curricula)
    .set({ modifications: merged as unknown as Record<string, unknown> })
    .where(eq(curricula.topicId, topicId));
}

export async function updateModificationStatus(
  topicId: number,
  modificationId: string,
  status: "accepted" | "rejected"
) {
  const modifications = await getCurriculumModifications(topicId);
  const updated = modifications.map((m) =>
    m.id === modificationId ? { ...m, status } : m
  );
  await db
    .update(curricula)
    .set({ modifications: updated as unknown as Record<string, unknown> })
    .where(eq(curricula.topicId, topicId));
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

export async function deleteModuleContent(topicId: number, moduleId: number) {
  await db.delete(moduleContent).where(
    and(eq(moduleContent.topicId, topicId), eq(moduleContent.moduleId, moduleId))
  );
}

// ── Module Audio ────────────────────────────────────────

export async function findAudio(topicId: number, moduleId: number) {
  const result = await db
    .select({ audioUrl: moduleContent.audioUrl, paragraphTimings: moduleContent.paragraphTimings })
    .from(moduleContent)
    .where(and(eq(moduleContent.topicId, topicId), eq(moduleContent.moduleId, moduleId)))
    .limit(1);
  return result[0] ?? null;
}

export async function saveAudio(topicId: number, moduleId: number, audioUrl: string, paragraphTimings: unknown) {
  await db.update(moduleContent)
    .set({ audioUrl, paragraphTimings })
    .where(and(eq(moduleContent.topicId, topicId), eq(moduleContent.moduleId, moduleId)));
}

export async function clearAudio(topicId: number, moduleId: number) {
  await db.update(moduleContent)
    .set({ audioUrl: null, paragraphTimings: null })
    .where(and(eq(moduleContent.topicId, topicId), eq(moduleContent.moduleId, moduleId)));
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

export async function searchModuleContentFTS(query: string, limit = 20) {
  const result = await db.execute(sql`
    SELECT id, topic_id as "topicId", module_id as "moduleId", content,
           ts_rank(content_tsv, plainto_tsquery('english', ${query})) as rank
    FROM module_content
    WHERE content_tsv @@ plainto_tsquery('english', ${query})
    ORDER BY rank DESC
    LIMIT ${limit}
  `);
  return result as unknown as Array<{
    id: number;
    topicId: number;
    moduleId: number;
    content: string;
    rank: number;
  }>;
}

// ── Learner Insights ───────────────────────────────────

export async function findLearnerInsights(topicId: number) {
  const result = await db
    .select()
    .from(learnerInsights)
    .where(eq(learnerInsights.topicId, topicId))
    .limit(1);
  return result[0] ?? null;
}

export async function saveLearnerInsights(
  topicId: number,
  data: {
    conceptMastery: unknown;
    strengthAreas: unknown;
    weakAreas: unknown;
    learningStyle: unknown;
    engagementProfile: unknown;
  }
) {
  const existing = await findLearnerInsights(topicId);

  if (existing) {
    await db
      .update(learnerInsights)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(learnerInsights.id, existing.id));
  } else {
    await db.insert(learnerInsights).values({ topicId, ...data });
  }
}

// ── Learner Signals ────────────────────────────────────

export async function logLearnerSignal(data: {
  topicId: number;
  moduleId?: number;
  subtopicId?: string;
  signalType: string;
  data: Record<string, unknown>;
}) {
  await db.insert(learnerSignals).values(data);
}

export async function getLearnerSignals(
  topicId: number,
  signalType?: string,
  limit: number = 100
) {
  if (signalType) {
    return db
      .select()
      .from(learnerSignals)
      .where(
        and(
          eq(learnerSignals.topicId, topicId),
          eq(learnerSignals.signalType, signalType)
        )
      )
      .orderBy(desc(learnerSignals.createdAt))
      .limit(limit);
  }
  return db
    .select()
    .from(learnerSignals)
    .where(eq(learnerSignals.topicId, topicId))
    .orderBy(desc(learnerSignals.createdAt))
    .limit(limit);
}

// ── Content Evaluations ────────────────────────────────

export async function saveContentEvaluation(data: {
  topicId: number;
  moduleId: number;
  subtopicId: string;
  dbKey: number;
  attempt: number;
  clarityScore: number;
  completenessScore: number;
  continuityScore: number | null;
  exampleQualityScore: number;
  accuracyScore: number;
  overallScore: number;
  verdict: string;
  issues: string[];
  suggestions: string[];
}) {
  await db.insert(contentEvaluations).values(data);
}

export async function getContentEvaluations(topicId: number, dbKey: number) {
  return db
    .select()
    .from(contentEvaluations)
    .where(
      and(
        eq(contentEvaluations.topicId, topicId),
        eq(contentEvaluations.dbKey, dbKey)
      )
    )
    .orderBy(asc(contentEvaluations.attempt));
}
