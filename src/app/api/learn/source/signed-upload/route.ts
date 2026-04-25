import { NextRequest, NextResponse } from "next/server";
import { supabase, STORAGE_BUCKET } from "@/lib/supabase/client";
import { generateSlug } from "@/lib/types/learning";
import { deriveTopicName } from "@/agents/topic-namer";

// Issues a one-time, scoped signed URL for the browser to upload a PDF
// directly to Supabase Storage. The server picks the storage path so the
// client cannot upload outside its slug. The topic row is NOT created here —
// /api/learn/source/upload finalizes the row only after the bytes land,
// preserving the existing "no orphan rows" property.
export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    topic,
    fileName,
    level,
    goal,
    slug: providedSlug,
  } = body as {
    topic?: string;
    fileName?: string;
    level?: string;
    goal?: string;
    slug?: string;
  };

  if (!topic || !fileName) {
    return NextResponse.json(
      { error: "topic and fileName are required" },
      { status: 400 }
    );
  }

  let topicSlug: string;
  let displayName: string;
  let category: string | undefined;

  if (providedSlug) {
    topicSlug = providedSlug;
    displayName = topic;
  } else {
    const derived = await deriveTopicName(
      topic,
      level || "intermediate",
      goal || "general understanding"
    );
    displayName = derived.name;
    category = derived.category;
    topicSlug = generateSlug(derived.name);
  }

  const path = `${topicSlug}/${Date.now()}-${fileName}`;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json(
      { error: `Failed to create signed upload URL: ${error?.message ?? "unknown"}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    signedUrl: data.signedUrl,
    token: data.token,
    path: data.path,
    topicSlug,
    displayName,
    category,
  });
}
