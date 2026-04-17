/**
 * Regression check for Experiment 001.
 *
 * Runs the winning variants against a "quick overview" learner profile.
 * A good tune should produce 2-3 sections for this, not 6-8.
 *
 * Usage: pnpm tsx scripts/experiments/001-module-planner/run-regression.ts
 */

import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { LlmAgent } from "@google/adk";
import { runAgent } from "@/agents/runner";
import { allVariants } from "./variants";
import {
  moduleTitle,
  modulePlan,
  compressedInterview,
  rawTranscript,
} from "./regression-fixtures";

loadEnv({ path: ".env.local" });

if (!process.env.GOOGLE_GENAI_API_KEY) {
  console.error("GOOGLE_GENAI_API_KEY missing — aborting.");
  process.exit(1);
}

const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-");
const OUT_DIR = path.join(__dirname, "runs", `regression-${RUN_ID}`);
fs.mkdirSync(OUT_DIR, { recursive: true });

const RUNS = Number(process.env.RUNS_PER_VARIANT ?? 3);
const filter = process.env.VARIANTS?.split(",").map((s) => s.trim().toUpperCase());
const variants = filter ? allVariants.filter((v) => filter.includes(v.id)) : allVariants;

async function main() {
  console.log(`Regression test: "Quick Docker overview, 30-45 min, just essentials"`);
  console.log(`Running ${variants.length} variants × ${RUNS} runs.\n`);

  const results: Array<{
    variant: string;
    sectionCounts: number[];
    firstConceptCounts: number[];
    firstTitles: string[];
  }> = [];

  for (const variant of variants) {
    console.log(`── Variant ${variant.id}: ${variant.name} (${variant.model}) ──`);

    const sectionCounts: number[] = [];
    const firstConceptCounts: number[] = [];
    const firstTitles: string[] = [];

    for (let i = 1; i <= RUNS; i++) {
      const instruction = variant.buildInstruction({
        moduleTitle,
        plan: modulePlan,
        compressedInterview,
        rawTranscript,
        previousSections: [],
        allConcepts: modulePlan.concepts,
      });

      const agent = new LlmAgent({
        name: `ModulePlanner_regression_${variant.id}`,
        model: variant.model,
        description: "Regression test variant",
        instruction: () => instruction,
        outputKey: "plan",
      });

      const userMessage =
        variant.id === "E" ? "Plan the entire module — produce all sections in one shot." : "Plan the next section.";

      const t0 = Date.now();
      const raw = await runAgent(agent, userMessage);
      const latency = Date.now() - t0;

      try {
        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (variant.id === "E") {
            const total = parsed.totalSections ?? (Array.isArray(parsed.sections) ? parsed.sections.length : null);
            if (total) sectionCounts.push(total);
            const first = Array.isArray(parsed.sections) ? parsed.sections[0] : null;
            if (first) {
              firstConceptCounts.push(Array.isArray(first.concepts) ? first.concepts.length : 0);
              if (first.title) firstTitles.push(first.title);
            }
          } else {
            if (typeof parsed.estimatedSections === "number") sectionCounts.push(parsed.estimatedSections);
            if (Array.isArray(parsed.concepts)) firstConceptCounts.push(parsed.concepts.length);
            if (typeof parsed.title === "string") firstTitles.push(parsed.title);
          }
          console.log(`  Run ${i}: sections=${parsed.estimatedSections ?? parsed.totalSections}, firstConcepts=${Array.isArray(parsed.concepts) ? parsed.concepts.length : Array.isArray(parsed.sections?.[0]?.concepts) ? parsed.sections[0].concepts.length : "?"}, latency=${latency}ms`);
        } else {
          console.log(`  Run ${i}: PARSE FAIL`);
        }
      } catch (err) {
        console.log(`  Run ${i}: ${err instanceof Error ? err.message : err}`);
      }

      // Save raw
      fs.appendFileSync(
        path.join(OUT_DIR, `${variant.id}.jsonl`),
        JSON.stringify({ run: i, latency, raw }) + "\n"
      );
    }

    results.push({
      variant: `${variant.id} (${variant.name})`,
      sectionCounts,
      firstConceptCounts,
      firstTitles,
    });
    console.log("");
  }

  console.log(`${"=".repeat(70)}`);
  console.log("REGRESSION CHECK SUMMARY");
  console.log("=".repeat(70));
  console.log("\nIf the winning variant produces 6+ sections for a 'quick 30-min overview' learner,");
  console.log("we've regressed the casual-learner case.\n");

  console.log("| Variant | Sections | First concepts | First title (sample) |");
  console.log("|---------|----------|----------------|----------------------|");
  for (const r of results) {
    const sectionsStr = r.sectionCounts.length > 0 ? `${Math.min(...r.sectionCounts)}-${Math.max(...r.sectionCounts)}` : "n/a";
    const conceptsStr = r.firstConceptCounts.length > 0 ? `${Math.min(...r.firstConceptCounts)}-${Math.max(...r.firstConceptCounts)}` : "n/a";
    const title = r.firstTitles[0] ?? "n/a";
    console.log(`| ${r.variant} | ${sectionsStr} | ${conceptsStr} | ${title.slice(0, 50)} |`);
  }

  console.log(`\nFull outputs at: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
