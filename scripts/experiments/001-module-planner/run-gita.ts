/**
 * Gita/Vedanta stress test — the hardest generality case.
 *
 * Runs Variant D on Shankaracharya's Commentary module 1 and logs detailed output.
 * Critical review questions to answer:
 *
 *   1. Does it group Sanskrit concepts sensibly (e.g., all 4 Sadhana Chatushtaya together)?
 *   2. Does it use scholarly/contemplative voice, NOT technical framing?
 *   3. Does it respect concept dependencies (Brahman and Maya are mutually defined)?
 *   4. Does it over-compress, under-compress, or match production (4 sections)?
 *   5. Any Sanskrit terms dropped without grounding?
 *   6. Any signs of Western-academic regression?
 */

import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { LlmAgent } from "@google/adk";
import { runAgent } from "@/agents/runner";
import { variantD } from "./variants";
import { topicShankaracharya } from "./gita-fixture";

loadEnv({ path: ".env.local" });

if (!process.env.GOOGLE_GENAI_API_KEY) {
  console.error("GOOGLE_GENAI_API_KEY missing — aborting.");
  process.exit(1);
}

const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-");
const OUT_DIR = path.join(__dirname, "runs", `gita-${RUN_ID}`);
fs.mkdirSync(OUT_DIR, { recursive: true });

const RUNS = Number(process.env.RUNS_PER_VARIANT ?? 3);

async function main() {
  const topic = topicShankaracharya;
  console.log(`Gita/Vedanta stress test for Variant D`);
  console.log(`Topic: ${topic.displayName}`);
  console.log(`Profile: ${topic.profileSummary}`);
  console.log(`Production baseline: ${topic.productionSubtopicCount} sections\n`);

  const runs: Array<{
    runNumber: number;
    latencyMs: number;
    parsed: Record<string, unknown> | null;
    rawOutput: string;
  }> = [];

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
      name: `ModulePlanner_gita`,
      model: variantD.model,
      description: "Gita stress test",
      instruction: () => instruction,
      outputKey: "plan",
    });

    const t0 = Date.now();
    const rawOutput = await runAgent(agent, "Plan the next section.");
    const latencyMs = Date.now() - t0;

    let parsed: Record<string, unknown> | null = null;
    try {
      const cleaned = rawOutput.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch {
      // ignore
    }

    runs.push({ runNumber: i, latencyMs, parsed, rawOutput });
    if (parsed) {
      console.log(`Run ${i}:`);
      console.log(`  Title: ${parsed.title}`);
      console.log(`  Concepts: ${JSON.stringify(parsed.concepts)}`);
      console.log(`  Estimated sections: ${parsed.estimatedSections}`);
      console.log(`  Scope: ${parsed.scope}`);
      console.log(`  Latency: ${latencyMs}ms\n`);
    } else {
      console.log(`Run ${i}: PARSE ERROR\n  Raw: ${rawOutput.slice(0, 500)}\n`);
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, "raw-runs.json"), JSON.stringify({ topic, runs }, null, 2));

  console.log(`${"=".repeat(70)}`);
  console.log("Critical review questions to answer by reading the output above:");
  console.log("=".repeat(70));
  console.log("1. Does it group Sanskrit concepts sensibly? (e.g., 4 qualifications together?)");
  console.log("2. Does it use scholarly/contemplative voice, NOT technical framing?");
  console.log("3. Does it ground Sanskrit terms before naming them?");
  console.log("4. Does it over/under-compress vs production (4 sections)?");
  console.log("5. Any Western-academic framing regression?");
  console.log(`\nOutputs at: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
