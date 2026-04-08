import type { LearnerIntentProfile } from "@/lib/types/learning";

/**
 * Formats the full learner interview for injection into agent instructions.
 * ~300-400 tokens. Every agent that needs learner context should use this.
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
 * Derive display-only level from interview for DB/UI.
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
 * Derive display-only time commitment from interview for DB/UI.
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
