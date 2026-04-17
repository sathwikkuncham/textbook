/**
 * Multi-topic generality test for Variant D.
 *
 * Tests whether Variant D's tune (PRO + depth enforcement + raw transcript)
 * adapts appropriately across 5 real DB topics spanning different domains,
 * depth levels, and time commitments.
 *
 * Usage: pnpm tsx scripts/experiments/001-module-planner/run-multi-topic.ts
 */

import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { LlmAgent } from "@google/adk";
import { runAgent } from "@/agents/runner";
import { variantD } from "./variants";
import { allTopicFixtures, type TopicFixture } from "./multi-topic-fixtures";

loadEnv({ path: ".env.local" });

if (!process.env.GOOGLE_GENAI_API_KEY) {
  console.error("GOOGLE_GENAI_API_KEY missing — aborting.");
  process.exit(1);
}

const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-");
const OUT_DIR = path.join(__dirname, "runs", `multi-topic-${RUN_ID}`);
fs.mkdirSync(OUT_DIR, { recursive: true });

const RUNS = Number(process.env.RUNS_PER_VARIANT ?? 3);

interface TopicResult {
  topic: TopicFixture;
  runs: Array<{
    runNumber: number;
    latencyMs: number;
    parsed: Record<string, unknown> | null;
    parseError?: string;
    rawOutput: string;
  }>;
}

async function runTopic(topic: TopicFixture): Promise<TopicResult> {
  const results: TopicResult["runs"] = [];

  for (let i = 1; i <= RUNS; i++) {
    const instruction = variantD.buildInstruction({
      moduleTitle: topic.moduleTitle,
      plan: topic.modulePlan,
      compressedInterview: topic.compressedInterview,
      rawTranscript: topic.rawTranscript,
      previousSections: [],
      allConcepts: topic.modulePlan.concepts,
    });

    const agent = new LlmAgent({
      name: `ModulePlanner_multitopic_${topic.id}`,
      model: variantD.model,
      description: "Multi-topic generality test",
      instruction: () => instruction,
      outputKey: "plan",
    });

    const t0 = Date.now();
    const rawOutput = await runAgent(agent, "Plan the next section.");
    const latencyMs = Date.now() - t0;

    let parsed: Record<string, unknown> | null = null;
    let parseError: string | undefined;
    try {
      const cleaned = rawOutput.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      else parseError = "No JSON found";
    } catch (err) {
      parseError = err instanceof Error ? err.message : String(err);
    }

    results.push({ runNumber: i, latencyMs, parsed, parseError, rawOutput });
    console.log(
      `  Run ${i}: ${parsed ? `sections=${parsed.estimatedSections}, firstConcepts=${Array.isArray(parsed.concepts) ? parsed.concepts.length : "?"}` : `PARSE_ERR: ${parseError}`} (${latencyMs}ms)`
    );
  }

  return { topic, runs: results };
}

async function main() {
  console.log(`Multi-topic test — Variant D across ${allTopicFixtures.length} real DB topics.`);
  console.log(`Runs per topic: ${RUNS}\n`);

  const allResults: TopicResult[] = [];

  for (const topic of allTopicFixtures) {
    console.log(`\n── Topic ${topic.id}: ${topic.displayName} ──`);
    console.log(`   Profile: ${topic.profileSummary}`);
    console.log(`   Production generated: ${topic.productionSubtopicCount} sections`);
    const result = await runTopic(topic);
    allResults.push(result);

    // Save per-topic raw output
    const topicFile = path.join(OUT_DIR, `topic-${topic.id}.json`);
    fs.writeFileSync(topicFile, JSON.stringify(result, null, 2));
  }

  // Summary report
  const report = generateReport(allResults);
  fs.writeFileSync(path.join(OUT_DIR, "summary.md"), report);

  console.log(`\n\n${"=".repeat(80)}`);
  console.log(report);
  console.log(`\n✓ Outputs: ${OUT_DIR}`);
}

function generateReport(results: TopicResult[]): string {
  const lines: string[] = [];
  lines.push(`# Variant D — Multi-Topic Generality Report`);
  lines.push(``);
  lines.push(`Run: ${RUN_ID}`);
  lines.push(``);
  lines.push(`## Overview`);
  lines.push(``);
  lines.push(`| Topic | Profile | Production | Variant D sections | First concept count | Variance |`);
  lines.push(`|-------|---------|------------|--------------------|--------------------|-----------|`);

  for (const r of results) {
    const sectionCounts = r.runs
      .map((run) => (run.parsed && typeof run.parsed.estimatedSections === "number" ? run.parsed.estimatedSections : null))
      .filter((x): x is number => x !== null);
    const conceptCounts = r.runs
      .map((run) => (run.parsed && Array.isArray(run.parsed.concepts) ? run.parsed.concepts.length : null))
      .filter((x): x is number => x !== null);

    const secRange = sectionCounts.length > 0 ? `${Math.min(...sectionCounts)}-${Math.max(...sectionCounts)}` : "n/a";
    const concRange = conceptCounts.length > 0 ? `${Math.min(...conceptCounts)}-${Math.max(...conceptCounts)}` : "n/a";
    const variance = new Set(sectionCounts).size === 1 ? "none" : `${new Set(sectionCounts).size} distinct values`;

    lines.push(
      `| ${r.topic.displayName} | ${r.topic.profileSummary} | ${r.topic.productionSubtopicCount} | ${secRange} | ${concRange} | ${variance} |`
    );
  }

  lines.push(``);
  lines.push(`## Per-topic detail`);
  lines.push(``);

  for (const r of results) {
    lines.push(`### Topic ${r.topic.id}: ${r.topic.displayName}`);
    lines.push(``);
    lines.push(`**Profile:** ${r.topic.profileSummary}`);
    lines.push(``);
    lines.push(`**Module:** ${r.topic.moduleTitle}`);
    lines.push(``);
    lines.push(`**Production baseline (${r.topic.productionSubtopicCount} sections):**`);
    for (const t of r.topic.productionSubtopicTitles) lines.push(`- ${t}`);
    lines.push(``);
    lines.push(`**Variant D runs:**`);
    for (const run of r.runs) {
      if (!run.parsed) {
        lines.push(``);
        lines.push(`#### Run ${run.runNumber} — PARSE ERROR: ${run.parseError}`);
        continue;
      }
      lines.push(``);
      lines.push(`#### Run ${run.runNumber}`);
      lines.push(`- **Title:** ${run.parsed.title}`);
      lines.push(`- **Concepts:** ${JSON.stringify(run.parsed.concepts)}`);
      lines.push(`- **Estimated sections:** ${run.parsed.estimatedSections}`);
      lines.push(`- **Scope:** ${run.parsed.scope}`);
      lines.push(`- **Latency:** ${run.latencyMs}ms`);
    }
    lines.push(``);
  }

  return lines.join("\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
