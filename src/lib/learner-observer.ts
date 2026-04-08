import { GoogleGenAI } from "@google/genai";

/**
 * Extracts a concise learning-pattern observation from a chat exchange.
 * Runs as a lightweight Gemini Flash call (~50-100 output tokens).
 * Fire-and-forget — should never block the chat response.
 */
export async function extractObservation(
  userMessage: string,
  assistantResponse: string,
  existingObservations?: string[]
): Promise<string | null> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });

  const existingContext = existingObservations?.length
    ? `\nExisting observations about this learner (do NOT repeat these):\n${existingObservations.slice(0, 10).map((o) => `- ${o}`).join("\n")}\n`
    : "";

  const prompt = `You are analyzing a learning interaction to understand HOW a person learns — not WHAT they're learning.

Given this chat exchange between a learner and an AI tutor, extract ONE concise observation (1 sentence, max 30 words) about the learner's thinking pattern, learning style, or comprehension approach.

Focus on patterns like:
- How they ask questions (causal chains, comparisons, premise-challenging)
- What confuses them vs what clicks immediately
- Whether they prefer analogies, logic, examples, or definitions
- Their vocabulary comfort level with technical terms
- Whether they connect ideas across domains

If the exchange reveals nothing new about how they learn (e.g., a simple factual question), respond with exactly: NONE
${existingContext}
Learner: ${userMessage.slice(0, 500)}

Tutor: ${assistantResponse.slice(0, 500)}

Observation (one sentence, or NONE):`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    const text = response.text?.trim() ?? "";
    if (!text || text === "NONE" || text.length < 5) return null;
    return text.slice(0, 200);
  } catch {
    return null;
  }
}
