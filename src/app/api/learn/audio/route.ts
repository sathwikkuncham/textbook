import { NextRequest, NextResponse } from "next/server";
import { findAudio, findModuleContent, saveAudio } from "@/lib/db/repository";
import { extractSections, generateAudio } from "@/lib/tts/generate";
import type { SectionAudio } from "@/lib/tts/generate";
import { supabase } from "@/lib/supabase/client";

const AUDIO_BUCKET = "audio-content";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const topicIdParam = searchParams.get("topicId");
  const moduleIdParam = searchParams.get("moduleId");

  if (!topicIdParam || !moduleIdParam) {
    return NextResponse.json(
      { error: "topicId and moduleId are required" },
      { status: 400 }
    );
  }

  const topicId = parseInt(topicIdParam, 10);
  const moduleId = parseInt(moduleIdParam, 10);

  if (isNaN(topicId) || isNaN(moduleId)) {
    return NextResponse.json(
      { error: "topicId and moduleId must be valid numbers" },
      { status: 400 }
    );
  }

  try {
    // Check DB for cached section audio
    const cached = await findAudio(topicId, moduleId);
    const existingSections = (cached?.audioUrl && Array.isArray(cached.paragraphTimings))
      ? cached.paragraphTimings as SectionAudio[]
      : [];

    // Fetch the content to determine what sections are needed
    const content = await findModuleContent(topicId, moduleId);
    if (!content) {
      return NextResponse.json(
        { error: "Module content not found. Load the content first." },
        { status: 404 }
      );
    }

    // Extract all sections from content
    const contentSections = extractSections(content.content);
    if (contentSections.length === 0) {
      return NextResponse.json(
        { error: "No readable sections found in content" },
        { status: 400 }
      );
    }

    // Determine which sections are already cached
    const existingIndices = new Set(existingSections.map((s) => s.index));
    const missingSections = contentSections.filter((s) => !existingIndices.has(s.index));

    // If all sections are cached, return immediately
    if (missingSections.length === 0 && existingSections.length > 0) {
      return NextResponse.json({ sections: existingSections });
    }

    // Generate audio only for missing sections using Promise.allSettled
    const results = await Promise.allSettled(
      missingSections.map(async (section) => {
        const { buffer } = await generateAudio(section.text);
        const storagePath = `audio/${topicId}/${moduleId}/section-${section.index}.wav`;

        const { error: uploadError } = await supabase.storage
          .from(AUDIO_BUCKET)
          .upload(storagePath, buffer, {
            contentType: "audio/wav",
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Upload failed for section ${section.index}: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage
          .from(AUDIO_BUCKET)
          .getPublicUrl(storagePath);

        return {
          index: section.index,
          title: section.title,
          audioUrl: urlData.publicUrl,
        } satisfies SectionAudio;
      })
    );

    // Collect succeeded sections
    const newSections = results
      .filter((r): r is PromiseFulfilledResult<SectionAudio> => r.status === "fulfilled")
      .map((r) => r.value);

    const failedCount = results.filter((r) => r.status === "rejected").length;

    // Merge with existing and sort by index
    const allSections = [...existingSections, ...newSections].sort(
      (a, b) => a.index - b.index
    );

    // Save whatever we have (even if partial)
    if (allSections.length > 0) {
      await saveAudio(topicId, moduleId, "sections", allSections);
    }

    return NextResponse.json({
      sections: allSections,
      partial: failedCount > 0,
      failedCount,
    });
  } catch (error) {
    console.error("[audio-api] Generation failed:", error);
    const message = error instanceof Error ? error.message : "Audio generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
