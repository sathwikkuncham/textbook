/**
 * Consolidated Module Planner comparison — Variant A (baseline) vs Variant D (candidate)
 * across all six canonical anchors, with a single unified summary.md.
 *
 * Why this exists:
 *   The initial variant-selection run (2026-04-16T20-16-49-564Z) tested all five
 *   variants on Topic 32 only. The multi-topic run tested Variant D on five
 *   topics. The Gita run tested Variant D on Topic 24. No single report brings
 *   production-baseline and candidate side-by-side across the same six topics.
 *
 *   This script fixes that before we lock Variant D into production. Clean
 *   empirical ground for the lock-in decision.
 *
 * Usage: pnpm tsx scripts/experiments/001-module-planner/run-consolidated.ts
 */

import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { LlmAgent } from "@google/adk";
import { runAgent } from "@/agents/runner";
import { variantA, variantD, type PlannerVariantConfig } from "./variants";
import { allSixAnchors } from "./all-anchors";
import type { TopicFixture } from "./multi-topic-fixtures";

loadEnv({ path: ".env.local" });

if (!process.env.GOOGLE_GENAI_API_KEY) {
  console.error("GOOGLE_GENAI_API_KEY missing — aborting.");
  process.exit(1);
}

const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-");
const OUT_DIR = path.join(__dirname, "runs", `consolidated-${RUN_ID}`);
fs.mkdirSync(OUT_DIR, { recursive: true });

const RUNS_PER_VARIANT = Number(process.env.RUNS_PER_VARIANT ?? 3);
const VARIANTS: PlannerVariantConfig[] = [variantA, variantD];

interface RunResult {
  runNumber: number;
  latencyMs: number;
  parsed: {
    done?: boolean;
    title?: string;
    scope?: string;
    concepts?: string[];
    estimatedSections?: number;
  } | null;
  parseError?: string;
  rawOutput: string;
}

interface VariantResult {
  variant: PlannerVariantConfig;
  runs: RunResult[];
}

interface TopicConsolidated {
  topic: TopicFixture;
  byVariant: Record<string, VariantResult>;
}

async function runVariantOnTopic(
  variant: PlannerVariantConfig,
  topic: TopicFixture
): Promise<VariantResult> {
  const runs: RunResult[] = [];

  for (let i = 1; i <= RUNS_PER_VARIANT; i++) {
    const instruction = variant.buildInstruction({
      moduleTitle: topic.moduleTitle,
      plan: topic.modulePlan,
      compressedInterview: topic.compressedInterview,
      rawTranscript: topic.rawTranscript,
      previousSections: [],
      allConcepts: topic.modulePlan.concepts,
    });

    const agent = new LlmAgent({
      name: `ModulePlanner_consolidated_${variant.id}_t${topic.id}`,
      model: variant.model,
      description: `Consolidated ${variant.id} × topic ${topic.id}`,
      instruction: () => instruction,
      outputKey: "plan",
    });

    const t0 = Date.now();
    let rawOutput = "";
    let parseError: string | undefined;
    let parsed: RunResult["parsed"] = null;

    try {
      rawOutput = await runAgent(agent, "Plan the next section.");
      const cleaned = rawOutput.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      else parseError = "No JSON found";
    } catch (err) {
      parseError = err instanceof Error ? err.message : String(err);
    }

    const latencyMs = Date.now() - t0;
    runs.push({ runNumber: i, latencyMs, parsed, parseError, rawOutput });

    const sections = parsed?.estimatedSections;
    const conceptCount = Array.isArray(parsed?.concepts) ? parsed.concepts.length : "?";
    console.log(
      `    [${variant.id}] Run ${i}: sections=${sections ?? "ERR"}, firstConcepts=${conceptCount} (${latencyMs}ms)${parseError ? ` PARSE_ERR: ${parseError}` : ""}`
    );
  }

  return { variant, runs };
}

async function runTopic(topic: TopicFixture): Promise<TopicConsolidated> {
  const byVariant: Record<string, VariantResult> = {};
  for (const variant of VARIANTS) {
    console.log(`  ── Variant ${variant.id} (${variant.name}) ──`);
    byVariant[variant.id] = await runVariantOnTopic(variant, topic);
  }
  return { topic, byVariant };
}

async function main() {
  console.log(`Consolidated Module Planner comparison`);
  console.log(`Variants: ${VARIANTS.map((v) => `${v.id} (${v.model})`).join(" | ")}`);
  console.log(`Topics: ${allSixAnchors.length}`);
  console.log(`Runs per variant per topic: ${RUNS_PER_VARIANT}`);
  console.log(`Total API calls: ${VARIANTS.length * allSixAnchors.length * RUNS_PER_VARIANT}`);
  console.log(`Output: ${OUT_DIR}\n`);

  const allResults: TopicConsolidated[] = [];

  for (const topic of allSixAnchors) {
    console.log(`\n── Topic ${topic.id}: ${topic.displayName} ──`);
    console.log(`   Profile: ${topic.profileSummary}`);
    console.log(`   Module: ${topic.moduleTitle}`);
    const result = await runTopic(topic);
    allResults.push(result);

    const topicFile = path.join(OUT_DIR, `topic-${topic.id}.json`);
    fs.writeFileSync(topicFile, JSON.stringify(result, null, 2));
    console.log(`   ✓ saved ${topicFile}`);
  }

  const report = generateReport(allResults);
  const summaryFile = path.join(OUT_DIR, "summary.md");
  fs.writeFileSync(summaryFile, report);

  console.log(`\n${"=".repeat(80)}`);
  console.log(`✓ Summary: ${summaryFile}`);
  console.log(`✓ Complete.`);
}

function sectionCountRange(runs: RunResult[]): string {
  const counts = runs
    .map((r) => (typeof r.parsed?.estimatedSections === "number" ? r.parsed.estimatedSections : null))
    .filter((x): x is number => x !== null);
  if (counts.length === 0) return "ERR";
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  return min === max ? String(min) : `${min}-${max}`;
}

function firstConceptRange(runs: RunResult[]): string {
  const counts = runs
    .map((r) => (Array.isArray(r.parsed?.concepts) ? r.parsed.concepts.length : null))
    .filter((x): x is number => x !== null);
  if (counts.length === 0) return "ERR";
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  return min === max ? String(min) : `${min}-${max}`;
}

function avgLatency(runs: RunResult[]): number {
  if (runs.length === 0) return 0;
  return Math.round(runs.reduce((s, r) => s + r.latencyMs, 0) / runs.length);
}

function generateReport(results: TopicConsolidated[]): string {
  const lines: string[] = [];

  lines.push(`# Module Planner — Consolidated Validation (A vs D)`);
  lines.push(``);
  lines.push(`Run ID: ${RUN_ID}`);
  lines.push(`Date: ${new Date().toISOString()}`);
  lines.push(`Variants tested: A (baseline — FLASH + old prompt) · D (candidate — PRO + raw transcript + depth enforcement)`);
  lines.push(`Runs per variant per topic: ${RUNS_PER_VARIANT}`);
  lines.push(``);

  lines.push(`## Purpose`);
  lines.push(``);
  lines.push(`Before locking Variant D into production \`module-orchestrator.ts\`, validate it against the old baseline across ALL six canonical anchor topics with one unified comparison. Prior experiments tested Variant D across these topics in three separate runs — this run consolidates into one side-by-side.`);
  lines.push(``);

  lines.push(`## Summary Table`);
  lines.push(``);
  lines.push(`| # | Topic | Profile | Production (historical) | A sections | A latency | D sections | D latency | Concept count D |`);
  lines.push(`|---|-------|---------|-------------------------|------------|-----------|------------|-----------|-----------------|`);

  for (const r of results) {
    const a = r.byVariant["A"];
    const d = r.byVariant["D"];
    lines.push(
      `| ${r.topic.id} | ${r.topic.displayName} | ${r.topic.profileSummary} | ${r.topic.productionSubtopicCount} | ${sectionCountRange(a.runs)} | ${avgLatency(a.runs)}ms | ${sectionCountRange(d.runs)} | ${avgLatency(d.runs)}ms | ${firstConceptRange(d.runs)} |`
    );
  }

  lines.push(``);
  lines.push(`## Per-topic Detail`);
  lines.push(``);

  for (const r of results) {
    lines.push(`### Topic ${r.topic.id}: ${r.topic.displayName}`);
    lines.push(``);
    lines.push(`**Module under test:** ${r.topic.moduleTitle}`);
    lines.push(``);
    lines.push(`**Module goal:** ${r.topic.modulePlan.goal}`);
    lines.push(``);
    lines.push(`**Concepts to cover (${r.topic.modulePlan.concepts.length}):**`);
    for (const c of r.topic.modulePlan.concepts) lines.push(`- ${c}`);
    lines.push(``);
    lines.push(`**Learner profile:** ${r.topic.profileSummary}`);
    lines.push(``);
    lines.push(`**Historical production baseline (${r.topic.productionSubtopicCount} subtopics):**`);
    for (const t of r.topic.productionSubtopicTitles) lines.push(`- ${t}`);
    lines.push(``);

    for (const variantId of ["A", "D"]) {
      const v = r.byVariant[variantId];
      lines.push(`#### Variant ${variantId} — ${v.variant.name}`);
      lines.push(``);
      for (const run of v.runs) {
        if (!run.parsed) {
          lines.push(`- Run ${run.runNumber}: PARSE ERROR — ${run.parseError}`);
          continue;
        }
        lines.push(`**Run ${run.runNumber}** (${run.latencyMs}ms, estimatedSections=${run.parsed.estimatedSections})`);
        lines.push(`- Title: ${run.parsed.title}`);
        lines.push(`- Concepts (${run.parsed.concepts?.length ?? 0}): ${JSON.stringify(run.parsed.concepts)}`);
        lines.push(`- Scope: ${run.parsed.scope}`);
        lines.push(``);
      }
    }
    lines.push(`---`);
    lines.push(``);
  }

  lines.push(`## Qualitative Review`);
  lines.push(``);
  lines.push(`_To be filled in by reviewer after reading all runs above._`);
  lines.push(``);
  lines.push(`### Depth calibration`);
  lines.push(`- Does Variant D expand for exhaustive learners (28, 32, 24)?`);
  lines.push(`- Does Variant D stay tight for beginners (29, 30)?`);
  lines.push(`- Does Variant D respect time constraints (31: 4 months, 30: 1 hour slow reader)?`);
  lines.push(``);
  lines.push(`### Voice and ordering`);
  lines.push(`- Does Variant D use the learner's own language where applicable?`);
  lines.push(`- Does Variant D start with the foundational concept the learner would land on first — not the textbook's chapter 1?`);
  lines.push(``);
  lines.push(`### Regression check`);
  lines.push(`- Does Variant D ever cram many concepts into one section (the old FLASH failure mode)?`);
  lines.push(`- Does Variant D ever produce fewer sections than A for advanced/exhaustive profiles?`);
  lines.push(``);

  return lines.join("\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
