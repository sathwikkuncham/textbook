import {
  pgTable,
  text,
  integer,
  timestamp,
  jsonb,
  serial,
  varchar,
  boolean,
  real,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const topics = pgTable(
  "topics",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 255 }).notNull(),
    displayName: text("display_name").notNull(),
    level: varchar("level", { length: 50 }).notNull(),
    goal: text("goal").notNull(),
    timeCommitment: varchar("time_commitment", { length: 50 }).notNull(),
    totalModules: integer("total_modules").notNull().default(0),
    estimatedMinutes: integer("estimated_minutes").notNull().default(0),
    completionPercent: real("completion_percent").notNull().default(0),
    currentModule: integer("current_module").notNull().default(1),
    currentSubtopic: integer("current_subtopic").notNull().default(1),
    totalTimeMinutes: integer("total_time_minutes").notNull().default(0),
    category: varchar("category", { length: 100 }).notNull().default("general"),
    sourceType: varchar("source_type", { length: 20 }).notNull().default("topic_only"),
    sourcePath: text("source_path"),
    learnerIntent: jsonb("learner_intent"),
    pipelinePhase: varchar("pipeline_phase", { length: 30 }).notNull().default("ready"),
    lastPosition: jsonb("last_position"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    lastSession: timestamp("last_session").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("topics_slug_idx").on(table.slug)]
);

export const researchCache = pgTable("research_cache", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id")
    .notNull()
    .references(() => topics.id, { onDelete: "cascade" }),
  foundations: jsonb("foundations"),
  applications: jsonb("applications"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const curricula = pgTable("curricula", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id")
    .notNull()
    .references(() => topics.id, { onDelete: "cascade" }),
  structure: jsonb("structure").notNull(),
  modifications: jsonb("modifications").notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const moduleContent = pgTable(
  "module_content",
  {
    id: serial("id").primaryKey(),
    topicId: integer("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    moduleId: integer("module_id").notNull(),
    content: text("content").notNull(),
    diagrams: text("diagrams"),
    audioUrl: text("audio_url"),
    paragraphTimings: jsonb("paragraph_timings"),
    qualityScore: real("quality_score"),
    generationAttempts: integer("generation_attempts").notNull().default(1),
    previousContent: text("previous_content"),
    previousDiagrams: text("previous_diagrams"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("module_content_topic_module_idx").on(
      table.topicId,
      table.moduleId
    ),
  ]
);

export const contentVersions = pgTable(
  "content_versions",
  {
    id: serial("id").primaryKey(),
    topicId: integer("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    moduleId: integer("module_id").notNull(),
    versionNumber: integer("version_number").notNull(),
    content: text("content").notNull(),
    diagrams: text("diagrams"),
    feedback: text("feedback"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("content_versions_topic_module_version_idx").on(
      table.topicId,
      table.moduleId,
      table.versionNumber
    ),
  ]
);

export const moduleQuizzes = pgTable(
  "module_quizzes",
  {
    id: serial("id").primaryKey(),
    topicId: integer("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    moduleId: integer("module_id").notNull(),
    questions: jsonb("questions").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("module_quizzes_topic_module_idx").on(
      table.topicId,
      table.moduleId
    ),
  ]
);

export const progress = pgTable(
  "progress",
  {
    id: serial("id").primaryKey(),
    topicId: integer("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    moduleId: integer("module_id").notNull(),
    subtopicId: varchar("subtopic_id", { length: 20 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("locked"),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    uniqueIndex("progress_topic_subtopic_idx").on(
      table.topicId,
      table.subtopicId
    ),
  ]
);

export const checkpoints = pgTable(
  "checkpoints",
  {
    id: serial("id").primaryKey(),
    topicId: integer("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    moduleId: integer("module_id").notNull(),
    passed: boolean("passed").notNull().default(false),
    score: real("score").notNull().default(0),
    attemptCount: integer("attempt_count").notNull().default(0),
    scoresHistory: jsonb("scores_history").notNull().default([]),
    lastAttemptAt: timestamp("last_attempt_at"),
  },
  (table) => [
    uniqueIndex("checkpoints_topic_module_idx").on(
      table.topicId,
      table.moduleId
    ),
  ]
);

export const spacedRepetition = pgTable(
  "spaced_repetition",
  {
    id: serial("id").primaryKey(),
    topicId: integer("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    moduleId: integer("module_id").notNull(),
    boxNumber: integer("box_number").notNull().default(1),
    nextReviewDate: timestamp("next_review_date").notNull(),
    lastReviewDate: timestamp("last_review_date"),
    lastScore: real("last_score"),
    reviewHistory: jsonb("review_history").notNull().default([]),
  },
  (table) => [
    uniqueIndex("spaced_rep_topic_module_idx").on(
      table.topicId,
      table.moduleId
    ),
  ]
);

export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id")
    .notNull()
    .references(() => topics.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("New Chat"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const chatHistory = pgTable("chat_history", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => chatSessions.id, { onDelete: "cascade" }),
  topicId: integer("topic_id")
    .notNull()
    .references(() => topics.id, { onDelete: "cascade" }),
  moduleId: integer("module_id"),
  subtopicId: varchar("subtopic_id", { length: 20 }),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sourceStructures = pgTable(
  "source_structures",
  {
    id: serial("id").primaryKey(),
    topicId: integer("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    rawToc: jsonb("raw_toc").notNull(),
    calibration: jsonb("calibration").notNull(),
    userScope: jsonb("user_scope"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("source_structures_topic_idx").on(table.topicId),
  ]
);

export const sourcePageCache = pgTable(
  "source_page_cache",
  {
    id: serial("id").primaryKey(),
    topicId: integer("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    sectionKey: varchar("section_key", { length: 255 }).notNull(),
    pageRangeStart: integer("page_range_start").notNull(),
    pageRangeEnd: integer("page_range_end").notNull(),
    extractedText: text("extracted_text").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("source_page_cache_topic_section_idx").on(
      table.topicId,
      table.sectionKey
    ),
  ]
);

export const documentChunks = pgTable(
  "document_chunks",
  {
    id: serial("id").primaryKey(),
    topicId: integer("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    // embedding column is halfvec(3072) — managed via raw SQL, not Drizzle
    sectionKey: varchar("section_key", { length: 255 }).notNull(),
    chapterTitle: text("chapter_title"),
    sectionTitle: text("section_title"),
    pageStart: integer("page_start"),
    pageEnd: integer("page_end"),
    contextPrefix: text("context_prefix"),
    tokenCount: integer("token_count"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("document_chunks_topic_chunk_idx").on(
      table.topicId,
      table.chunkIndex
    ),
  ]
);

export const learnerInsights = pgTable(
  "learner_insights",
  {
    id: serial("id").primaryKey(),
    topicId: integer("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    conceptMastery: jsonb("concept_mastery").notNull().default({}),
    strengthAreas: jsonb("strength_areas").notNull().default([]),
    weakAreas: jsonb("weak_areas").notNull().default([]),
    learningStyle: jsonb("learning_style").notNull().default({}),
    engagementProfile: jsonb("engagement_profile").notNull().default({}),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("learner_insights_topic_idx").on(table.topicId)]
);

export const learnerSignals = pgTable("learner_signals", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id")
    .notNull()
    .references(() => topics.id, { onDelete: "cascade" }),
  moduleId: integer("module_id"),
  subtopicId: varchar("subtopic_id", { length: 20 }),
  signalType: varchar("signal_type", { length: 50 }).notNull(),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const learnerObservations = pgTable("learner_observations", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id")
    .notNull()
    .references(() => topics.id, { onDelete: "cascade" }),
  moduleId: integer("module_id"),
  subtopicId: varchar("subtopic_id", { length: 20 }),
  observation: text("observation").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const contentEvaluations = pgTable("content_evaluations", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id")
    .notNull()
    .references(() => topics.id, { onDelete: "cascade" }),
  moduleId: integer("module_id").notNull(),
  subtopicId: varchar("subtopic_id", { length: 20 }).notNull(),
  dbKey: integer("db_key").notNull(),
  attempt: integer("attempt").notNull(),
  clarityScore: real("clarity_score").notNull(),
  completenessScore: real("completeness_score").notNull(),
  continuityScore: real("continuity_score"),
  exampleQualityScore: real("example_quality_score").notNull(),
  accuracyScore: real("accuracy_score").notNull(),
  overallScore: real("overall_score").notNull(),
  verdict: varchar("verdict", { length: 20 }).notNull(),
  issues: jsonb("issues").notNull().default([]),
  suggestions: jsonb("suggestions").notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
