import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = `You are a learning advisor conducting a brief intake interview. Your job is to understand what the learner needs so the system can create the perfect learning experience for them.

## Your Behavior

Ask 3-5 adaptive questions (no more). Be conversational, warm, and efficient. Each question should build on their previous answer.

## What You Need to Understand

1. What they're trying to learn and from what source (topic, textbook, blog, paper, URL)
2. WHY they're learning this (curiosity, interview prep, project, promotion, exam)
3. What they already know about this subject
4. How deep they want to go
5. How much time they have

## How to Adapt

- If they provide a URL or mention a blog: this is likely a quick read. Ask about depth and purpose, not extensive background.
- If they mention a textbook or upload a PDF: this is substantial. Ask about scope (cover-to-cover or focused chapters?) and timeline.
- If they type a vague concept: probe their background. Are they complete beginners or have some familiarity?
- If they mention interview prep: ask what kind (FAANG system design? startup practical? general CS?)
- If they mention a project: ask what they're building and what specific knowledge gaps they have.

## When You Have Enough

After 3-5 exchanges (including your first question), you MUST produce the profile. Do NOT keep asking questions indefinitely.

When ready, output the learner profile wrapped in <profile> tags like this:

<profile>
{
  "sourceType": "textbook",
  "purpose": "Staff engineer promotion — needs system design depth",
  "priorKnowledge": "Understands basic SQL and replication, weak on distributed consensus and partitioning",
  "desiredDepth": "Deep — system design interview level",
  "timeAvailable": "3 hours per week for 3 months",
  "focusAreas": ["distributed consensus", "partitioning strategies", "transaction isolation"]
}
</profile>

After the profile, add a brief confirmation message like "Here's what I understand about your learning goals. Does this look right?"

## Rules

- Be natural and conversational, not robotic
- Don't ask all questions at once — one at a time
- Don't repeat information the user already provided
- Adjust your language to match the user's apparent level
- NEVER ask more than 5 questions total
- ALWAYS produce the profile by the end`;

export async function runInterview(
  history: Array<{ role: "user" | "assistant"; content: string }>,
  sourceMeta?: { type: string; name?: string; url?: string }
): Promise<{ text: string; profile?: Record<string, unknown> }> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GENAI_API_KEY is required");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Build context about source material if provided
  let sourceContext = "";
  if (sourceMeta) {
    if (sourceMeta.type === "pdf" && sourceMeta.name) {
      sourceContext = `\n\nThe learner has uploaded a PDF: "${sourceMeta.name}". Factor this into your questions — ask about which parts they want to focus on and how deeply.`;
    } else if (sourceMeta.type === "url" && sourceMeta.url) {
      sourceContext = `\n\nThe learner provided a URL: ${sourceMeta.url}. This might be a blog post, documentation, or article. Adjust your questions accordingly.`;
    }
  }

  const contents = history.map((msg) => ({
    role: (msg.role === "user" ? "user" : "model") as "user" | "model",
    parts: [{ text: msg.content }],
  }));

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents,
    config: {
      systemInstruction: `${SYSTEM_INSTRUCTION}${sourceContext}`,
    },
  });

  const text = response.text?.trim() ?? "";

  // Check if the response contains a profile
  const profileMatch = text.match(/<profile>\s*([\s\S]*?)\s*<\/profile>/);
  let profile: Record<string, unknown> | undefined;

  if (profileMatch) {
    try {
      profile = JSON.parse(profileMatch[1]);
    } catch {
      // Profile parsing failed — continue without it
    }
  }

  // Clean the profile tags from the visible text
  const cleanText = text.replace(/<profile>[\s\S]*?<\/profile>/g, "").trim();

  return { text: cleanText, profile };
}
