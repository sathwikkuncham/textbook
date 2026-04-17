import type { LearnerIntentProfile } from "@/lib/types/learning";

/**
 * UI-FACING SUMMARY ONLY.
 *
 * Returns the labeled-fields version of the learner profile. This is for
 * display surfaces (confirmation card, settings page header, memory
 * snapshots) and nothing else. It deliberately omits the raw transcript.
 *
 * DO NOT pass this to agents. Agents receive the full interview via
 * `formatFullInterviewForAgent` below, which preserves the learner's own
 * words — the richest signal we capture.
 */
export function formatInterviewForAgent(
  intent: LearnerIntentProfile | Record<string, unknown>
): string {
  const profile = intent as Record<string, unknown>;
  const parts: string[] = [];

  if (profile.purpose) parts.push(`Purpose: ${profile.purpose}`);
  if (profile.priorKnowledge) parts.push(`Prior knowledge: ${profile.priorKnowledge}`);
  if (profile.desiredDepth) parts.push(`Desired depth: ${profile.desiredDepth}`);
  if (profile.timeAvailable) parts.push(`Time available: ${profile.timeAvailable}`);
  const focusAreas = profile.focusAreas as string[] | undefined;
  if (focusAreas?.length) parts.push(`Focus areas: ${focusAreas.join(", ")}`);
  if (profile.sourceType) parts.push(`Source type: ${profile.sourceType}`);

  return parts.join("\n");
}

/**
 * THE canonical interview context for any downstream agent.
 *
 * Combines the labeled summary (quick scan) with the full raw intake
 * transcript (the learner's own words). Agents should read the transcript
 * first — it carries intent, register, and character that the summary
 * flattens.
 *
 * Contract: every API route that hands learner context to an agent MUST
 * use this function, never `formatInterviewForAgent`.
 */
export function formatFullInterviewForAgent(
  intent: LearnerIntentProfile | Record<string, unknown>
): string {
  const summary = formatInterviewForAgent(intent);
  const profile = intent as Record<string, unknown>;
  const transcript = profile.rawTranscript as
    | Array<{ role: string; content: string }>
    | undefined;

  if (!transcript || transcript.length === 0) {
    return summary;
  }

  const transcriptText = transcript
    .map((t) => `${t.role === "user" ? "User" : "Advisor"}: ${t.content}`)
    .join("\n\n");

  return `## Learner profile (labeled summary)
${summary}

## Full intake conversation (learner's own words)
${transcriptText}`;
}

/**
 * Derive display-only level from interview for DB/UI only.
 * NOT used by any agent — agents read the full interview.
 */
export function deriveDisplayLevel(intent: LearnerIntentProfile | Record<string, unknown>): string {
  const profile = intent as Record<string, unknown>;
  const depth = ((profile.desiredDepth as string) ?? "").toLowerCase();
  const prior = ((profile.priorKnowledge as string) ?? "").toLowerCase();

  if (depth.includes("overview") || prior.includes("none") || prior.includes("beginner")) return "beginner";
  if (depth.includes("deep") || depth.includes("depth") || depth.includes("exhaust")
    || depth.includes("expert") || depth.includes("maximum") || depth.includes("advanced")
    || depth.includes("scholarly")) return "advanced";
  return "intermediate";
}

/**
 * Derive display-only time commitment from interview for DB/UI only.
 * NOT used by any agent — agents read the full interview.
 */
export function deriveDisplayTimeCommitment(intent: LearnerIntentProfile | Record<string, unknown>): string {
  const profile = intent as Record<string, unknown>;
  const time = ((profile.timeAvailable as string) ?? "").toLowerCase();

  if (time.includes("quick") || time.includes("30 min") || time.includes("overview")) return "quick";
  if (time.includes("unlimited") || time.includes("long-term") || time.includes("no deadline")
    || time.includes("no rush") || time.includes("deep") || time.includes("year")
    || time.includes("month")) return "deep";
  return "standard";
}
