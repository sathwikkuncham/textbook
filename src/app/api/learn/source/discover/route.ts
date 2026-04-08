import { NextRequest, NextResponse } from "next/server";
import { supabase, STORAGE_BUCKET } from "@/lib/supabase/client";
import { discoverPDFStructure } from "@/lib/pdf/extractor";
import { createWebExplorer } from "@/agents/web-explorer";
import { runAgent } from "@/agents/runner";
import {
  findTopicBySlug,
  findSourceStructure,
  saveSourceStructure,
  updatePipelinePhase,
} from "@/lib/db/repository";
import { generateSlug } from "@/lib/types/learning";
import type { SourceToc, PageCalibration } from "@/lib/types/learning";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { topic, slug: providedSlug } = body;

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
      { error: "Topic not found. Upload source material first." },
      { status: 400 }
    );
  }

  // Return cached structure if exists
  const cached = await findSourceStructure(topicRecord.id);
  if (cached) {
    return NextResponse.json({
      success: true,
      topicId: topicRecord.id,
      topicSlug,
      structure: cached.rawToc,
      calibration: cached.calibration,
      userScope: cached.userScope,
      cached: true,
    });
  }

  if (!topicRecord.sourcePath) {
    return NextResponse.json(
      { error: "No source file associated with this topic." },
      { status: 400 }
    );
  }

  // Branch by source type
  if (topicRecord.sourceType === "url") {
    // URL-based discovery using WebExplorer agent
    try {
      const explorer = createWebExplorer(topicRecord.id, topicRecord.sourcePath);
      const agentResult = await runAgent(
        explorer,
        `Explore ${topicRecord.sourcePath} and build a comprehensive site map. Read the main page, follow relevant links, and cache all content.`
      );

      let parsed: Record<string, unknown>;
      try {
        const jsonMatch = agentResult.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found");
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        return NextResponse.json(
          { error: "Failed to parse URL structure", raw: agentResult },
          { status: 500 }
        );
      }

      const sourceToc: SourceToc = {
        title: (parsed.title as string) ?? topicRecord.displayName,
        author: parsed.author as string | undefined,
        totalPages: (parsed.totalPages as number) ?? 1,
        chapters: ((parsed.chapters as Array<Record<string, unknown>>) ?? []).map((ch) => ({
          id: ch.id as string,
          title: ch.title as string,
          pageStart: (ch.pageStart as number) ?? 1,
          pageEnd: (ch.pageEnd as number) ?? 1,
          sourceUrl: ch.sourceUrl as string | undefined,
          sections: ((ch.sections as Array<Record<string, unknown>>) ?? []).map((s) => ({
            id: s.id as string,
            title: s.title as string,
            pageStart: (s.pageStart as number) ?? 1,
            pageEnd: (s.pageEnd as number) ?? 1,
            depth: (s.depth as number) ?? 1,
          })),
        })),
      };

      const calibration: PageCalibration = {
        pdfPageOffset: 0,
        anchors: [],
        totalPdfPages: sourceToc.totalPages ?? 1,
      };

      await saveSourceStructure(topicRecord.id, sourceToc, calibration);
      await updatePipelinePhase(topicRecord.id, "source_discovered");

      return NextResponse.json({
        success: true,
        topicId: topicRecord.id,
        topicSlug,
        structure: sourceToc,
        calibration,
        userScope: null,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "URL discovery failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // PDF-based discovery — download from Supabase Storage
  const { data: fileData, error: downloadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(topicRecord.sourcePath);

  if (downloadError || !fileData) {
    return NextResponse.json(
      { error: `Failed to download source: ${downloadError?.message}` },
      { status: 500 }
    );
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());

  try {
    // Send the entire PDF to Gemini — it natively handles PDFs up to 3600 pages
    const agentResult = await discoverPDFStructure(buffer);

    // Parse the JSON response
    let parsed: {
      title?: string;
      author?: string;
      totalPages?: number;
      chapters?: Array<{
        id: string;
        title: string;
        pageStart: number;
        pageEnd: number;
        sections?: Array<{
          id: string;
          title: string;
          pageStart: number;
          pageEnd: number;
          depth?: number;
        }>;
      }>;
      calibration?: {
        pdfPageOffset: number;
        anchors: Array<{ printedPage: number; pdfIndex: number }>;
        totalPdfPages: number;
      };
    };

    try {
      const jsonMatch = agentResult.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse document structure", raw: agentResult },
        { status: 500 }
      );
    }

    const sourceToc: SourceToc = {
      title: parsed.title ?? topicRecord.displayName,
      author: parsed.author,
      totalPages: parsed.totalPages,
      chapters: (parsed.chapters ?? []).map((ch) => ({
        id: ch.id,
        title: ch.title,
        pageStart: ch.pageStart,
        pageEnd: ch.pageEnd,
        sections: (ch.sections ?? []).map((s) => ({
          id: s.id,
          title: s.title,
          pageStart: s.pageStart,
          pageEnd: s.pageEnd,
          depth: s.depth ?? 1,
        })),
      })),
    };

    const calibration: PageCalibration = parsed.calibration ?? {
      pdfPageOffset: 0,
      anchors: [],
      totalPdfPages: parsed.totalPages ?? 0,
    };

    await saveSourceStructure(topicRecord.id, sourceToc, calibration);
    await updatePipelinePhase(topicRecord.id, "source_discovered");

    return NextResponse.json({
      success: true,
      topicId: topicRecord.id,
      topicSlug,
      structure: sourceToc,
      calibration,
      userScope: null,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Structure discovery failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
