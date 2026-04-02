import { NextRequest, NextResponse } from "next/server";
import {
  findTopicBySlug,
  findResearchByTopicId,
  findCurriculumByTopicId,
  findSourceStructure,
} from "@/lib/db/repository";
import { db } from "@/lib/db/client";
import { moduleContent } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");

  if (!slug) {
    return NextResponse.json(
      { error: "slug is required" },
      { status: 400 }
    );
  }

  const topic = await findTopicBySlug(slug);
  if (!topic) {
    return NextResponse.json(
      { error: "Topic not found" },
      { status: 404 }
    );
  }

  const [research, curriculum, sourceStructure, contentCountResult] =
    await Promise.all([
      findResearchByTopicId(topic.id),
      findCurriculumByTopicId(topic.id),
      findSourceStructure(topic.id),
      db
        .select({ count: sql<number>`count(*)` })
        .from(moduleContent)
        .where(eq(moduleContent.topicId, topic.id)),
    ]);

  const totalSubtopics = curriculum
    ? curriculum.modules.reduce((sum, m) => sum + m.subtopics.length, 0)
    : 0;

  return NextResponse.json({
    pipelinePhase: topic.pipelinePhase,
    lastPosition: topic.lastPosition,
    hasInterview: !!topic.learnerIntent,
    hasResearch: !!research,
    hasCurriculum: !!curriculum,
    hasSourceStructure: !!sourceStructure,
    hasScope: !!sourceStructure?.userScope,
    contentCount: Number(contentCountResult[0]?.count ?? 0),
    totalSubtopics,
    sourceType: topic.sourceType,
    completionPercent: topic.completionPercent,
  });
}
