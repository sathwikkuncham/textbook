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
    if (cached?.audioUrl && Array.isArray(cached.paragraphTimings) && cached.paragraphTimings.length > 0) {
      return NextResponse.json({
        sections: cached.paragraphTimings as SectionAudio[],
      });
    }

    // Fetch the content to generate audio from
    const content = await findModuleContent(topicId, moduleId);
    if (!content) {
      return NextResponse.json(
        { error: "Module content not found. Load the content first." },
        { status: 404 }
      );
    }

    // Extract sections (skips "Visualizing It")
    const contentSections = extractSections(content.content);
    if (contentSections.length === 0) {
      return NextResponse.json(
        { error: "No readable sections found in content" },
        { status: 400 }
      );
    }

    // Generate audio for all sections in parallel
    const audioResults = await Promise.all(
      contentSections.map(async (section) => {
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

    // Save to DB
    await saveAudio(topicId, moduleId, "sections", audioResults);

    return NextResponse.json({ sections: audioResults });
  } catch (error) {
    console.error("[audio-api] Generation failed:", error);
    const message = error instanceof Error ? error.message : "Audio generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
