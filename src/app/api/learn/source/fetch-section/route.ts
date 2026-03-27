import { NextRequest, NextResponse } from "next/server";
import { supabase, STORAGE_BUCKET } from "@/lib/supabase/client";
import { extractPDFSection } from "@/lib/pdf/extractor";
import {
  findTopicBySlug,
  findSourceStructure,
  findCachedPageText,
  cachePageText,
} from "@/lib/db/repository";
import { generateSlug } from "@/lib/types/learning";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { topic, slug: providedSlug, sectionId, sectionTitle } = body;

  if (!topic || (!sectionId && !sectionTitle)) {
    return NextResponse.json(
      { error: "topic and either sectionId or sectionTitle are required" },
      { status: 400 }
    );
  }

  const topicSlug = providedSlug || generateSlug(topic);
  const topicRecord = await findTopicBySlug(topicSlug);

  if (!topicRecord?.sourcePath) {
    return NextResponse.json(
      { error: "Source-based topic not found." },
      { status: 400 }
    );
  }

  const sourceStructure = await findSourceStructure(topicRecord.id);
  if (!sourceStructure) {
    return NextResponse.json(
      { error: "Source structure not found. Run discovery first." },
      { status: 400 }
    );
  }

  // Find the section in the TOC
  const toc = sourceStructure.rawToc;
  const calibration = sourceStructure.calibration;
  let resolvedSectionKey = sectionId || "";
  let resolvedTitle = sectionTitle || "";
  let pageStart: number | null = null;
  let pageEnd: number | null = null;

  const searchTerm = (sectionTitle ?? "").toLowerCase();

  for (const chapter of toc.chapters) {
    if (
      chapter.id === sectionId ||
      chapter.title.toLowerCase().includes(searchTerm)
    ) {
      resolvedSectionKey = chapter.id;
      resolvedTitle = chapter.title;
      pageStart = chapter.pageStart;
      pageEnd = chapter.pageEnd;
      break;
    }
    for (const section of chapter.sections) {
      if (
        section.id === sectionId ||
        section.title.toLowerCase().includes(searchTerm)
      ) {
        resolvedSectionKey = section.id;
        resolvedTitle = section.title;
        pageStart = section.pageStart;
        pageEnd = section.pageEnd;
        break;
      }
    }
    if (pageStart !== null) break;
  }

  if (!resolvedSectionKey) {
    return NextResponse.json(
      {
        error: `Section not found: ${sectionId || sectionTitle}`,
        availableSections: toc.chapters.map((ch) => ({
          id: ch.id,
          title: ch.title,
        })),
      },
      { status: 404 }
    );
  }

  // Check cache
  const cached = await findCachedPageText(topicRecord.id, resolvedSectionKey);
  if (cached) {
    return NextResponse.json({
      success: true,
      sectionKey: resolvedSectionKey,
      text: cached,
      cached: true,
    });
  }

  // Download PDF from Supabase
  const { data: fileData, error: downloadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(topicRecord.sourcePath);

  if (downloadError || !fileData) {
    return NextResponse.json(
      { error: `Download failed: ${downloadError?.message}` },
      { status: 500 }
    );
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());

  try {
    // Use Gemini to extract the section content directly from the PDF
    const pageHint =
      pageStart !== null && pageEnd !== null
        ? {
            start: pageStart + calibration.pdfPageOffset,
            end: pageEnd + calibration.pdfPageOffset,
          }
        : undefined;

    const extractedText = await extractPDFSection(
      buffer,
      resolvedTitle,
      pageHint
    );

    // Cache for future use
    await cachePageText(
      topicRecord.id,
      resolvedSectionKey,
      pageStart ?? 0,
      pageEnd ?? 0,
      extractedText
    );

    return NextResponse.json({
      success: true,
      sectionKey: resolvedSectionKey,
      text: extractedText,
      cached: false,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Section extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
