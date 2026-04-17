import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  findTopicBySlug,
  findSourceStructure,
  findLearnerIntent,
} from "@/lib/db/repository";
import { generateSlug } from "@/lib/types/learning";
import { formatFullInterviewForAgent } from "@/lib/interview-context";
import { MODELS } from "@/agents/models";

const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_GENAI_API_KEY ?? ""
);

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { topic, slug: providedSlug, level, goal } = body;

  if (!topic) {
    return NextResponse.json(
      { error: "topic is required" },
      { status: 400 }
    );
  }

  const topicSlug = providedSlug || generateSlug(topic);
  const topicRecord = await findTopicBySlug(topicSlug);

  if (!topicRecord) {
    return NextResponse.json(
      { error: "Topic not found." },
      { status: 400 }
    );
  }

  const learnerIntent = await findLearnerIntent(topicRecord.id);
  const interviewContext = learnerIntent
    ? formatFullInterviewForAgent(learnerIntent as Record<string, unknown>)
    : null;

  const structure = await findSourceStructure(topicRecord.id);
  if (!structure) {
    return NextResponse.json(
      { error: "Source structure not found." },
      { status: 400 }
    );
  }

  const toc = structure.rawToc;
  const chapterList = toc.chapters
    .map(
      (ch) =>
        `- ${ch.title} (${ch.pageEnd - ch.pageStart} pages, ${ch.sections.length} sections)`
    )
    .join("\n");

  const prompt = `You are an expert learning advisor. A learner wants to study "${toc.title}" by ${toc.author ?? "unknown"}.

${interviewContext ? `Learner profile:\n${interviewContext}` : `Their level: ${level ?? "beginner"}\nTheir goal: ${goal ?? "general understanding"}`}

Here is the table of contents:
${chapterList}

Based on their level and goal, provide a brief recommendation (2-3 sentences) about which chapters to prioritize and which they might skip. Be specific and actionable. Do NOT return JSON — just a plain text recommendation.`;

  try {
    const model = genAI.getGenerativeModel({
      model: MODELS.PRO,
    });
    const result = await model.generateContent(prompt);
    const recommendation = result.response.text();

    return NextResponse.json({
      success: true,
      recommendation,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Suggestion failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
