import { GoogleGenAI } from "@google/genai";
import { MODELS } from "./models";

const CATEGORIES = [
  "programming",
  "systems",
  "data-science",
  "web-dev",
  "devops",
  "theory",
  "math",
  "design",
  "general",
] as const;

interface TopicNameResult {
  name: string;
  category: string;
}

/**
 * Uses Gemini Flash to derive a clean, concise topic name and category
 * from the user's raw input description. Direct API call — no ADK
 * agent to avoid template engine issues with curly braces.
 */
export async function deriveTopicName(
  rawInput: string,
  level: string,
  goal: string
): Promise<TopicNameResult> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    // Fallback: truncate raw input
    return { name: rawInput.slice(0, 60), category: "general" };
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are naming a learning topic for an educational app. The user described what they want to learn. Derive a clean, concise topic name (2-6 words) and assign a category.

User input: "${rawInput}"
Level: ${level}
Goal: ${goal}

Categories: ${CATEGORIES.join(", ")}

Respond with ONLY a JSON object, no markdown, no explanation:
{"name": "Clean Topic Name", "category": "category-slug"}

Rules:
- Name should be 2-6 words, title case
- Name captures the core subject, not the user's full request
- Category must be one of the listed values
- If unsure about category, use "general"`;

  try {
    const response = await ai.models.generateContent({
      model: MODELS.PRO,
      contents: prompt,
    });

    const text = response.text?.trim() ?? "";
    // Strip any markdown code fences
    const clean = text.replace(/```json\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(clean);

    const name = typeof parsed.name === "string" ? parsed.name.slice(0, 100) : rawInput.slice(0, 60);
    const category = CATEGORIES.includes(parsed.category) ? parsed.category : "general";

    return { name, category };
  } catch {
    // Fallback on any failure
    return { name: rawInput.slice(0, 60), category: "general" };
  }
}
