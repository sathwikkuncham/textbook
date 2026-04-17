/**
 * Experiment 001 — Module Planner tuning.
 *
 * For each variant, run 3 times with the FIRST-SECTION state (no previous sections)
 * for Module 1 of the transformer-networks topic. Measure what the planner decides.
 *
 * Usage:
 *   pnpm tsx scripts/experiments/001-module-planner/run.ts
 *
 * Optional env vars:
 *   VARIANTS=A,B,C,D,E   — comma-separated list; default runs all
 *   RUNS_PER_VARIANT=3   — how many runs per variant; default 3
 */

import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { LlmAgent } from "@google/adk";
import { runAgent } from "@/agents/runner";
import { allVariants, type PlannerVariantConfig } from "./variants";
import { moduleTitle, modulePlan, compressedInterview, rawTranscript } from "./fixtures";

// Load .env.local for GOOGLE_GENAI_API_KEY
loadEnv({ path: ".env.local" });

if (!process.env.GOOGLE_GENAI_API_KEY) {
  console.error("GOOGLE_GENAI_API_KEY missing — aborting.");
  process.exit(1);
}

// ── Output setup ─────────────────────────────────────────

const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-");
const OUT_DIR = path.join(__dirname, "runs", RUN_ID);
fs.mkdirSync(OUT_DIR, { recursive: true });
console.log(`Writing results to: ${OUT_DIR}\n`);

// ── Config ───────────────────────────────────────────────

const RUNS_PER_VARIANT = Number(process.env.RUNS_PER_VARIANT ?? 3);
const filterList = process.env.VARIANTS?.split(",").map((s) => s.trim().toUpperCase());
const variantsToRun = filterList
  ? allVariants.filter((v) => filterList.includes(v.id))
  : allVariants;

// ── Single run ───────────────────────────────────────────

interface RunResult {
  variantId: string;
  runNumber: number;
  latencyMs: number;
  rawOutput: string;
  parsed: Record<string, unknown> | null;
  parseError?: string;
}

async function runOnce(variant: PlannerVariantConfig, runNumber: number): Promise<RunResult> {
  const instruction = variant.buildInstruction({
    moduleTitle,
    plan: modulePlan,
    compressedInterview,
    rawTranscript,
    previousSections: [],
    allConcepts: modulePlan.concepts,
  });

  const agent = new LlmAgent({
    name: `ModulePlanner_${variant.id}`,
    model: variant.model,
    description: "Plans the next section of a module (experiment variant)",
    instruction: () => instruction,
    outputKey: "plan",
  });

  const userMessage =
    variant.id === "E"
      ? "Plan the entire module — produce all sections in one shot."
      : "Plan the next section.";

  const t0 = Date.now();
  const rawOutput = await runAgent(agent, userMessage);
  const latencyMs = Date.now() - t0;

  let parsed: Record<string, unknown> | null = null;
  let parseError: string | undefined;
  try {
    const cleaned = rawOutput.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      parseError = "No JSON object found in output";
    }
  } catch (err) {
    parseError = err instanceof Error ? err.message : String(err);
  }

  return { variantId: variant.id, runNumber, latencyMs, rawOutput, parsed, parseError };
}

// ── Metrics ──────────────────────────────────────────────

interface VariantMetrics {
  variantId: string;
  variantName: string;
  model: string;
  runCount: number;
  // Section count — for A-D this is estimatedSections from first decision;
  // for E this is totalSections from the upfront plan
  sectionCounts: number[];
  // Concepts in the first section (regardless of variant type)
  firstSectionConceptCounts: number[];
  firstSectionTitles: string[];
  latencyMsList: number[];
  parseFailures: number;
}

function extractMetrics(variant: PlannerVariantConfig, runs: RunResult[]): VariantMetrics {
  const sectionCounts: number[] = [];
  const firstSectionConceptCounts: number[] = [];
  const firstSectionTitles: string[] = [];
  const latencyMsList: number[] = [];
  let parseFailures = 0;

  for (const run of runs) {
    latencyMsList.push(run.latencyMs);
    if (!run.parsed) {
      parseFailures++;
      continue;
    }
    if (variant.id === "E") {
      const totalSections = typeof run.parsed.totalSections === "number" ? run.parsed.totalSections : null;
      const sections = Array.isArray(run.parsed.sections) ? run.parsed.sections : [];
      if (totalSections !== null) sectionCounts.push(totalSections);
      else if (sections.length > 0) sectionCounts.push(sections.length);
      if (sections.length > 0) {
        const first = sections[0] as Record<string, unknown>;
        const concepts = Array.isArray(first.concepts) ? first.concepts : [];
        firstSectionConceptCounts.push(concepts.length);
        if (typeof first.title === "string") firstSectionTitles.push(first.title);
      }
    } else {
      const estimatedSections =
        typeof run.parsed.estimatedSections === "number" ? run.parsed.estimatedSections : null;
      if (estimatedSections !== null) sectionCounts.push(estimatedSections);
      const concepts = Array.isArray(run.parsed.concepts) ? run.parsed.concepts : [];
      firstSectionConceptCounts.push(concepts.length);
      if (typeof run.parsed.title === "string") firstSectionTitles.push(run.parsed.title);
    }
  }

  return {
    variantId: variant.id,
    variantName: variant.name,
    model: variant.model,
    runCount: runs.length,
    sectionCounts,
    firstSectionConceptCounts,
    firstSectionTitles,
    latencyMsList,
    parseFailures,
  };
}

function summary(nums: number[]): string {
  if (nums.length === 0) return "n/a";
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  return `min=${min}, max=${max}, avg=${avg.toFixed(1)}`;
}

// ── Main ─────────────────────────────────────────────────

async function main() {
  console.log(`Running ${variantsToRun.length} variants × ${RUNS_PER_VARIANT} runs each.\n`);

  const allMetrics: VariantMetrics[] = [];

  for (const variant of variantsToRun) {
    console.log(`\n── Variant ${variant.id}: ${variant.name} (${variant.model}) ──`);
    const runs: RunResult[] = [];

    for (let i = 1; i <= RUNS_PER_VARIANT; i++) {
      process.stdout.write(`  Run ${i}/${RUNS_PER_VARIANT}... `);
      try {
        const result = await runOnce(variant, i);
        runs.push(result);
        console.log(`${result.latencyMs}ms ${result.parsed ? "OK" : `PARSE_ERR: ${result.parseError}`}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`ERROR: ${msg}`);
        runs.push({
          variantId: variant.id,
          runNumber: i,
          latencyMs: 0,
          rawOutput: `EXECUTION_ERROR: ${msg}`,
          parsed: null,
          parseError: msg,
        });
      }
    }

    // Save raw outputs for this variant
    const variantFile = path.join(OUT_DIR, `variant-${variant.id}.json`);
    fs.writeFileSync(variantFile, JSON.stringify({ variant, runs }, null, 2));

    const metrics = extractMetrics(variant, runs);
    allMetrics.push(metrics);

    console.log(`  Sections decided: ${summary(metrics.sectionCounts)}`);
    console.log(`  First section concepts: ${summary(metrics.firstSectionConceptCounts)}`);
    console.log(`  Latency: ${summary(metrics.latencyMsList)}ms`);
    console.log(`  Parse failures: ${metrics.parseFailures}`);
  }

  // Summary report
  const report = generateReport(allMetrics);
  const reportFile = path.join(OUT_DIR, "summary.md");
  fs.writeFileSync(reportFile, report);

  console.log(`\n\n${"=".repeat(70)}`);
  console.log("SUMMARY");
  console.log("=".repeat(70));
  console.log(report);
  console.log(`\n✓ Full outputs at: ${OUT_DIR}`);
}

function generateReport(metrics: VariantMetrics[]): string {
  const lines: string[] = [];
  lines.push(`# Module Planner Experiment — Summary`);
  lines.push(``);
  lines.push(`Run: ${RUN_ID}`);
  lines.push(`Variants: ${metrics.map((m) => m.variantId).join(", ")}`);
  lines.push(`Runs per variant: ${RUNS_PER_VARIANT}`);
  lines.push(``);
  lines.push(`## Results`);
  lines.push(``);
  lines.push(`| Variant | Name | Model | Sections (est total) | First-section concepts | Parse fails | Avg latency |`);
  lines.push(`|---------|------|-------|---------------------|------------------------|-------------|-------------|`);

  for (const m of metrics) {
    const avgLatency =
      m.latencyMsList.length > 0
        ? Math.round(m.latencyMsList.reduce((a, b) => a + b, 0) / m.latencyMsList.length)
        : 0;
    lines.push(
      `| ${m.variantId} | ${m.variantName} | ${m.model} | ${summary(m.sectionCounts)} | ${summary(m.firstSectionConceptCounts)} | ${m.parseFailures}/${m.runCount} | ${avgLatency}ms |`
    );
  }

  lines.push(``);
  lines.push(`## First-section titles per variant`);
  lines.push(``);
  for (const m of metrics) {
    lines.push(`### Variant ${m.variantId} — ${m.variantName}`);
    for (const title of m.firstSectionTitles) {
      lines.push(`- "${title}"`);
    }
    lines.push(``);
  }

  lines.push(`## Ground truth (production)`);
  lines.push(``);
  lines.push(`For this same Module 1 input, the production system produced **2 sections** covering 5 concepts in section 1.1. This is the failure we are trying to fix.`);
  lines.push(``);
  lines.push(`## Pass criteria`);
  lines.push(``);
  lines.push(`For a learner who said "exhaustive, no time limit, first principles":`);
  lines.push(`- Sections should be **≥ 4** (ideally 5-8)`);
  lines.push(`- First-section concepts should be **≤ 3** (ideally 1-2)`);
  lines.push(`- Parse failures should be **0**`);
  lines.push(`- Low variance across runs (all 3 runs cluster around the same section count)`);
  return lines.join("\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
