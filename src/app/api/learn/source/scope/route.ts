import { NextRequest, NextResponse } from "next/server";
import { findTopicBySlug, updateUserScope } from "@/lib/db/repository";
import { generateSlug } from "@/lib/types/learning";
import type { UserScopeSelection } from "@/lib/types/learning";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { topic, scope } = body as {
    topic: string;
    scope: UserScopeSelection;
  };

  if (!topic || !scope) {
    return NextResponse.json(
      { error: "topic and scope are required" },
      { status: 400 }
    );
  }

  if (!scope.included || !Array.isArray(scope.included)) {
    return NextResponse.json(
      { error: "scope.included must be an array of chapter/section IDs" },
      { status: 400 }
    );
  }

  const topicSlug = generateSlug(topic);
  const topicRecord = await findTopicBySlug(topicSlug);

  if (!topicRecord) {
    return NextResponse.json(
      { error: "Topic not found." },
      { status: 400 }
    );
  }

  await updateUserScope(topicRecord.id, scope);

  return NextResponse.json({
    success: true,
    topicId: topicRecord.id,
    topicSlug,
    includedCount: scope.included.length,
    excludedCount: scope.excluded.length,
  });
}
