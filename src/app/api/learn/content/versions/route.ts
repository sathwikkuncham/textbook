import { NextRequest, NextResponse } from "next/server";
import {
  findTopicBySlug,
  findModuleContent,
  getContentVersions,
  saveContentVersion,
  deleteContentVersion,
  getLatestVersionNumber,
  saveModuleContent,
} from "@/lib/db/repository";
import { generateSlug } from "@/lib/types/learning";
import { embedGeneratedContent } from "@/lib/embeddings/pipeline";

// GET — List all versions for a module
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const slug = params.get("slug");
  const moduleId = parseInt(params.get("moduleId") ?? "0");

  if (!slug || !moduleId) {
    return NextResponse.json(
      { error: "slug and moduleId are required" },
      { status: 400 }
    );
  }

  const topicRecord = await findTopicBySlug(slug);
  if (!topicRecord) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  const versions = await getContentVersions(topicRecord.id, moduleId);

  return NextResponse.json({
    success: true,
    versions: versions.map((v) => ({
      id: v.id,
      versionNumber: v.versionNumber,
      feedback: v.feedback,
      createdAt: v.createdAt,
      contentPreview: v.content.slice(0, 300),
      content: v.content,
      diagrams: v.diagrams,
    })),
  });
}

// POST — Restore a specific version (copies to module_content, keeps all versions)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { slug, moduleId, versionId } = body;

  if (!slug || !moduleId || !versionId) {
    return NextResponse.json(
      { error: "slug, moduleId, and versionId are required" },
      { status: 400 }
    );
  }

  const topicRecord = await findTopicBySlug(slug);
  if (!topicRecord) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  const versions = await getContentVersions(topicRecord.id, moduleId);
  const version = versions.find((v) => v.id === versionId);
  if (!version) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  // Update module_content with the restored version's content
  // Don't create a new version — just swap the active content
  const existing = await findModuleContent(topicRecord.id, moduleId);
  if (existing) {
    const { db } = await import("@/lib/db/client");
    const { moduleContent } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");
    await db
      .update(moduleContent)
      .set({
        content: version.content,
        diagrams: version.diagrams,
        audioUrl: null,
        paragraphTimings: null,
      })
      .where(eq(moduleContent.id, existing.id));
  }

  // Re-embed restored content (fire-and-forget)
  embedGeneratedContent(
    topicRecord.id,
    moduleId,
    version.content,
    topicRecord.displayName,
    "",
    ""
  ).catch(console.error);

  return NextResponse.json({
    success: true,
    content: version.content,
    diagrams: version.diagrams,
    restoredVersion: version.versionNumber,
    currentVersion: await getLatestVersionNumber(topicRecord.id, moduleId),
  });
}

// DELETE — Delete a specific version
export async function DELETE(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const versionId = parseInt(params.get("versionId") ?? "0");

  if (!versionId) {
    return NextResponse.json(
      { error: "versionId is required" },
      { status: 400 }
    );
  }

  await deleteContentVersion(versionId);

  return NextResponse.json({ success: true });
}
