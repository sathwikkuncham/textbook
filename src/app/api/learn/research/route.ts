import { NextRequest, NextResponse } from "next/server";
import { generateSlug } from "@/lib/types/learning";
import {
  findTopicBySlug,
  createTopic,
  findResearchByTopicId,
  saveResearch,
} from "@/lib/db/repository";
import { createResearchPipeline } from "@/agents/pipelines/research-pipeline";
import { runAgent } from "@/agents/runner";
import { deriveTopicName } from "@/agents/topic-namer";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { topic, level, goal, timeCommitment } = body;

  if (!topic || !level || !goal) {
    return NextResponse.json(
      { error: "topic, level, and goal are required" },
      { status: 400 }
    );
  }

  // Derive a clean topic name and category from the raw user input
  const { name: derivedName, category } = await deriveTopicName(topic, level, goal);
  const topicSlug = generateSlug(derivedName);

  let topicRecord = await findTopicBySlug(topicSlug);
  if (!topicRecord) {
    topicRecord = await createTopic({
      slug: topicSlug,
      displayName: derivedName,
      level,
      goal,
      timeCommitment: timeCommitment ?? "standard",
      category,
    });
  }

  const cached = await findResearchByTopicId(topicRecord.id);
  if (cached) {
    return NextResponse.json({
      success: true,
      topicSlug,
      topicId: topicRecord.id,
      research: cached,
      cached: true,
    });
  }

  try {
    const pipeline = createResearchPipeline(topic, level, goal);

    const result = await runAgent(
      pipeline,
      `Research the topic "${topic}" thoroughly. The learner is at ${level} level with the goal of ${goal}. Provide comprehensive research findings.`
    );

    let foundations = null;
    try {
      foundations = JSON.parse(result);
    } catch {
      foundations = { raw_output: result };
    }

    const researchData = {
      foundations,
      applications: { raw_output: "Combined with foundations research" },
    } as unknown as import("@/lib/types/learning").ResearchCache;

    await saveResearch(topicRecord.id, researchData);

    return NextResponse.json({
      success: true,
      topicSlug,
      topicId: topicRecord.id,
      research: researchData,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Research pipeline failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
