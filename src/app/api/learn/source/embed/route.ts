import { NextRequest, NextResponse } from "next/server";
import {
  findTopicBySlug,
  hasDocumentChunks,
  getDocumentChunkCount,
} from "@/lib/db/repository";
import { runEmbeddingPipeline } from "@/lib/embeddings/pipeline";
import { generateSlug } from "@/lib/types/learning";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, slug: providedSlug, forceReembed, cachedOnly } = body;

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

    if (topicRecord.sourceType === "topic_only") {
      return NextResponse.json({
        success: true,
        message: "Topic-only sources do not need embedding",
      });
    }

    const result = await runEmbeddingPipeline(
      topicRecord.id,
      topicSlug,
      topicRecord.sourceType,
      topicRecord.sourcePath ?? "",
      { forceReembed: !!forceReembed, cachedOnly: !!cachedOnly }
    );

    const response: Record<string, unknown> = {
      success: result.success,
      totalChunks: result.totalChunks,
      sectionsProcessed: result.sectionsProcessed,
      sectionsSkipped: result.sectionsSkipped,
    };

    if (result.errors.length > 0) {
      response.errors = result.errors;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[embed] POST failed:", error);
    return NextResponse.json(
      { error: "Embedding pipeline failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { error: "slug query parameter is required" },
        { status: 400 }
      );
    }

    const topicRecord = await findTopicBySlug(slug);

    if (!topicRecord) {
      return NextResponse.json(
        { error: "Topic not found." },
        { status: 400 }
      );
    }

    const embedded = await hasDocumentChunks(topicRecord.id);
    const chunkCount = await getDocumentChunkCount(topicRecord.id);

    return NextResponse.json({
      embedded,
      chunkCount,
      sourceType: topicRecord.sourceType,
    });
  } catch (error) {
    console.error("[embed] GET failed:", error);
    return NextResponse.json(
      { error: "Failed to check embedding status" },
      { status: 500 }
    );
  }
}
