import { NextRequest, NextResponse } from "next/server";
import { generateSlug } from "@/lib/types/learning";
import {
  findTopicBySlug,
  createTopic,
  findResearchByTopicId,
  saveResearch,
  updateLearnerIntent,
  updatePipelinePhase,
} from "@/lib/db/repository";
import { createResearchPipeline } from "@/agents/pipelines/research-pipeline";
import { runAgent } from "@/agents/runner";
import { deriveTopicName } from "@/agents/topic-namer";
import { formatInterviewForAgent } from "@/lib/interview-context";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { topic, slug: providedSlug, level, goal, timeCommitment, learnerIntent } = body;

  if (!topic || !level || !goal) {
    return NextResponse.json(
      { error: "topic, level, and goal are required" },
      { status: 400 }
    );
  }

  // If a slug is provided, find the existing topic directly.
  // Otherwise derive a clean topic name for first-time creation.
  let topicSlug: string;
  let topicRecord = providedSlug
    ? await findTopicBySlug(providedSlug)
    : null;

  if (topicRecord) {
    topicSlug = providedSlug!;
  } else {
    const { name: derivedName, category } = await deriveTopicName(topic, level, goal);
    topicSlug = generateSlug(derivedName);
    topicRecord = await findTopicBySlug(topicSlug);
    if (!topicRecord) {
      topicRecord = await createTopic({
        slug: topicSlug,
        displayName: derivedName,
        level,
        goal,
        timeCommitment: timeCommitment ?? "standard",
        category,
      });
      await updatePipelinePhase(topicRecord.id, "created");
    }
  }

  // Save learner intent if provided
  if (learnerIntent) {
    await updateLearnerIntent(topicRecord.id, learnerIntent);
    await updatePipelinePhase(topicRecord.id, "interviewed");
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
    const interviewContext = learnerIntent
      ? formatInterviewForAgent(learnerIntent as Record<string, unknown>)
      : undefined;

    const pipeline = createResearchPipeline(topic, level, goal, interviewContext);

    const result = await runAgent(
      pipeline,
      `Research the topic "${topic}" thoroughly. Provide comprehensive research findings.`
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
    await updatePipelinePhase(topicRecord.id, "researched");

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
