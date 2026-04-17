/**
 * All six canonical anchor topics for Module Planner validation.
 *
 * These six span the range our system must handle without regressing any:
 *   29  — LLMs (beginner, 15-30 min, absolute beginner)
 *   30  — Turboquant (beginner, 1 hour, slow reader)
 *   28  — CLRS Algorithms (advanced, exhaustive, rusty math, no time limit)
 *   31  — Psoriasis (advanced, PG exam, 4 months, molecular depth)
 *   32  — Transformer Networks (advanced, exhaustive, PDF, no time limit)
 *   24  — Shankaracharya's Commentary (advanced, philosophical, PDF, years)
 *
 * Any change to the planner must work across all six. The consolidated runner
 * uses this list to produce a single side-by-side report.
 */

import type { ModulePlan } from "@/lib/types/learning";
import {
  topicCLRS,
  topicLLMs,
  topicPsoriasis,
  topicSystemDesign,
  topicTurboquant,
  type TopicFixture,
} from "./multi-topic-fixtures";
import { topicShankaracharya } from "./gita-fixture";
import {
  modulePlan as transformerPlan,
  moduleTitle as transformerModuleTitle,
  compressedInterview as transformerCompressed,
  rawTranscript as transformerRaw,
} from "./fixtures";

const transformerModulePlan: ModulePlan = transformerPlan;

// Topic 32 Transformer — wrapped into TopicFixture shape.
// Production baseline captured from DB state 2026-04-17: Module 1 had 2
// subtopics for 6 concepts (the rushed state that triggered this overhaul).
export const topicTransformer: TopicFixture = {
  id: 32,
  slug: "transformer-networks-history-and-theory",
  displayName: "Transformer Networks: History and Theory",
  moduleTitle: transformerModuleTitle,
  modulePlan: transformerModulePlan,
  compressedInterview: transformerCompressed,
  rawTranscript: transformerRaw,
  productionSubtopicCount: 2,
  productionSubtopicTitles: [
    "Shannon Entropy and Markov Foundations (rushed — 6 concepts across 2 sections)",
    "From n-grams to Generative Models (rushed — 6 concepts across 2 sections)",
  ],
  profileSummary: "Advanced · Exhaustive first-principles · No time limit · Senior SWE, rusty math · 6 concepts",
};

/**
 * Six canonical anchors ordered beginner → advanced.
 * Note: System Design (topic 33) is excluded — it was an auxiliary test topic,
 * not part of the core six.
 */
export const allSixAnchors: TopicFixture[] = [
  topicLLMs,           // 29 — beginner, 15-30 min
  topicTurboquant,     // 30 — beginner, 1 hour, slow reader
  topicCLRS,           // 28 — advanced, exhaustive, rusty math
  topicPsoriasis,      // 31 — advanced, PG exam, molecular depth
  topicTransformer,    // 32 — advanced, first-principles, PDF
  topicShankaracharya, // 24 — advanced, philosophical, Sanskrit
];

export { topicSystemDesign }; // exported for reuse if needed
